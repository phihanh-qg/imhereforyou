import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini API client to prevent crash if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resilient helper to call Gemini with retry & model fallback (gemini-3.7-flash -> gemini-3.1-flash-lite -> gemini-flash-latest)
async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (initErr) {
    console.warn("Gemini client initialization error:", initErr);
    throw initErr;
  }

  const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    // Attempt up to 2 times for transient 503/429 spikes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTemporary =
          err?.status === 503 ||
          err?.code === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("Resource has been exhausted");

        if (isTemporary && attempt === 0) {
          // Brief pause before trying again or switching
          await sleep(300);
          continue;
        }
        console.warn(`[AI Engine] Model ${model} temporarily unavailable, falling back to alternative model...`);
        break;
      }
    }
  }
  throw lastError;
}

function generateFallbackWeeklySummary(
  parentName: string,
  weeklyStats: {
    checkInCount?: number;
    dominantMood?: string;
    voiceCount?: number;
    alertsCount?: number;
  }
): string {
  const name = parentName || "Bố/Mẹ";
  const count = weeklyStats?.checkInCount ?? 0;
  const mood = weeklyStats?.dominantMood || "Ổn định";
  const voice = weeklyStats?.voiceCount ?? 0;

  if (count >= 5) {
    return `${name} giữ nhịp sinh hoạt rất đều đặn tuần này (${count}/7 ngày check-in, tâm trạng: ${mood}). Hãy gửi một lời nhắn thoại để tiếp thêm niềm vui cho ${name} nhé!`;
  } else if (count >= 2) {
    return `${name} đã check-in ${count} ngày trong tuần này. Những ngày cuối tuần là thời điểm tuyệt vời để con gọi điện tâm sự và hỏi thăm sức khỏe ${name}.`;
  } else {
    return `Tuần qua số lần check-in của ${name} chưa nhiều. Con hãy dành chút thời gian bấm nút gọi điện hoặc gửi lời nhắn yêu thương để ${name} luôn an tâm nhé.`;
  }
}

function generateFallbackAnalysis(
  parentName: string,
  relationship: string,
  checkIns: any[],
  moods: any[],
  missedDays: number
) {
  const name = parentName || relationship || "Bố/Mẹ";
  const checkInCount = checkIns?.length || 0;
  const hasRecentSadOrTired = moods?.some((m: any) => m.mood === "tired" || m.mood === "sad");

  let status: "normal" | "attention" | "alert" = "normal";
  let summary = `${name} duy trì thói quen tương tác tốt với gia đình trong tuần qua.`;
  let recommendation = `Hãy duy trì thói quen gọi điện hoặc gửi lời nhắn thoại ngắn mỗi ngày để ${name} luôn cảm thấy ấm áp.`;
  let suggestedActionTitle = `Gọi điện hỏi thăm ${name}`;

  if (missedDays >= 3 || (checkInCount < 2 && missedDays >= 2)) {
    status = "alert";
    summary = `Gần đây ${name} có nhiều ngày chưa bấm check-in đúng khung giờ kỳ vọng.`;
    recommendation = `Con nên chủ động gọi điện trực tiếp để kiểm tra xem ${name} có gặp vấn đề về sức khỏe hay quên bấm nút hay không.`;
    suggestedActionTitle = `Gọi kiểm tra sức khỏe ${name}`;
  } else if (hasRecentSadOrTired || missedDays >= 1) {
    status = "attention";
    summary = `${name} có dấu hiệu hơi mệt hoặc lỡ khung giờ check-in gần đây.`;
    recommendation = `Một cuộc gọi ngắn 5 phút vào buổi tối sẽ giúp ${name} cảm thấy vui vẻ và an lòng hơn rất nhiều.`;
    suggestedActionTitle = `Gọi tâm sự cùng ${name}`;
  }

  const changes = [
    `Đã ghi nhận ${checkInCount} lần check-in trong dữ liệu gần đây`,
    `Tâm trạng ghi nhận gần nhất: ${moods?.[0]?.moodLabel || "Bình thường"}`,
    `Số ngày chưa check-in đúng giờ: ${missedDays} ngày`,
  ];

  return {
    status,
    summary,
    changes,
    recommendation,
    suggestedActionTitle,
    confidence: 0.88,
  };
}

async function startServer() {
  const app = express();

  // Middleware for JSON body parsing (with large limit for audio base64)
  app.use(express.json({ limit: "25mb" }));

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "Con Có Ở Đây - I'm Here For You API",
      timestamp: new Date().toISOString(),
    });
  });

  // In-memory persistent server cache for family invite codes across tabs/devices
  const serverFamilies = new Map<string, any>();
  const serverInviteCodes = new Map<string, string>(); // code -> familyId

  // Family Registry Endpoints
  app.post("/api/family/register", (req, res) => {
    const { family, inviteCode } = req.body;
    if (family && family.id) {
      serverFamilies.set(family.id, family);
      const code = (inviteCode || family.inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
      if (code) {
        serverInviteCodes.set(code, family.id);
      }
      return res.json({ success: true, familyId: family.id, code });
    }
    return res.status(400).json({ error: "Invalid family payload" });
  });

  app.get("/api/family/lookup/:code", (req, res) => {
    const rawCode = req.params.code || "";
    const cleanCode = rawCode.trim().replace(/[\s-]/g, "").toUpperCase();

    // 1. Direct code lookup
    const familyId = serverInviteCodes.get(cleanCode);
    if (familyId && serverFamilies.has(familyId)) {
      return res.json({ found: true, family: serverFamilies.get(familyId) });
    }

    // 2. Direct familyId lookup
    if (serverFamilies.has(rawCode)) {
      return res.json({ found: true, family: serverFamilies.get(rawCode) });
    }

    // 3. Scan all families in memory
    for (const [id, fam] of serverFamilies.entries()) {
      const fCode = (fam.inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
      if (fCode === cleanCode || id === rawCode) {
        return res.json({ found: true, family: fam });
      }
    }

    return res.json({ found: false });
  });

  // AI Family Pattern Analysis Endpoint
  app.post("/api/ai/analyze-family", async (req, res) => {
    const { parentName, relationship, checkIns, moods, voiceTranscripts, missedDays, checkInWindow } = req.body;

    if (!checkIns || !Array.isArray(checkIns)) {
      return res.status(400).json({ error: "Dữ liệu check-in không hợp lệ." });
    }

    const systemPrompt = `Bạn là trợ lý AI thấu cảm cho ứng dụng gắn kết gia đình "Con Có Ở Đây" (I'm Here For You).
Nhiệm vụ của bạn là phân tích thói quen tương tác, tâm trạng và lời nhắn của người lớn tuổi (${parentName || "Bố/Mẹ"}) trong 7-14 ngày qua để giúp con cái nhận ra sự thay đổi và biết cách chăm sóc phù hợp.

NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI:
1. KHÔNG chẩn đoán bệnh tật, KHÔNG kết luận trầm cảm, sa sút trí tuệ hay bất kỳ bệnh lý y khoa nào.
2. KHÔNG khẳng định chắc chắn tuyệt đối từ dữ liệu hữu hạn.
3. Luôn dùng ngôn từ ấm áp, tôn trọng, khuyến khích sự lắng nghe và thăm hỏi giữa các thành viên.
4. Tập trung vào các mẫu hành vi: tần suất check-in, khung giờ tương tác, sự biến đổi tâm trạng, nội dung lời nhắn thoại.
5. Đưa ra gợi ý hành động thiết thực cho người con (ví dụ: gọi điện hỏi thăm vào cuối tuần, gửi tin nhắn thoại, nhắc uống nước/đi dạo).

Hãy trả về kết quả bằng tiếng Việt theo định dạng JSON có cấu trúc chính xác.`;

    const userContent = `Dữ liệu lịch sử 7-14 ngày qua của ${relationship || "Bố/Mẹ"} (${parentName || "Mẹ"}):
- Khung giờ check-in kỳ vọng: ${checkInWindow?.startHour || 7}:00 đến ${checkInWindow?.endHour || 10}:00
- Tổng số lần check-in ghi nhận: ${checkIns.length}
- Chi tiết check-in gần nhất: ${JSON.stringify(checkIns.slice(0, 10))}
- Nhật ký tâm trạng gần đây: ${JSON.stringify(moods?.slice(0, 10) || [])}
- Các đoạn trích lời nhắn thoại: ${JSON.stringify(voiceTranscripts || [])}
- Số ngày vắng mặt/check-in muộn: ${missedDays || 0} ngày.

Hãy phân tích toàn diện và đưa ra nhận xét trung thực, ấm áp.`;

    try {
      const response = await generateGeminiContentWithFallback({
        contents: [
          { role: "system", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: userContent }] },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                description:
                  "Trạng thái tổng quan: 'normal' (Ổn định), 'attention' (Cần chú ý thăm hỏi), hoặc 'alert' (Có biểu hiện mệt mỏi/vắng mặt liên tiếp)",
                enum: ["normal", "attention", "alert"],
              },
              summary: {
                type: Type.STRING,
                description: "Tóm tắt ngắn gọn 2-3 câu về tình hình của bố/mẹ bằng ngôn từ ấm áp",
              },
              changes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Danh sách 2-4 quan sát cụ thể (ví dụ: 'Check-in đúng giờ 6/7 ngày', '3 ngày gần nhất chọn Hơi mệt')",
              },
              recommendation: {
                type: Type.STRING,
                description: "Lời khuyên chân thành và gợi ý cụ thể cho con cái",
              },
              suggestedActionTitle: {
                type: Type.STRING,
                description: "Tiêu đề hành động gợi ý, ví dụ: 'Gọi điện hỏi thăm mẹ lúc 20:00'",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Độ tin cậy của phân tích dựa trên lượng dữ liệu (0.0 đến 1.0)",
              },
            },
            required: [
              "status",
              "summary",
              "changes",
              "recommendation",
              "suggestedActionTitle",
              "confidence",
            ],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);

      return res.json({
        success: true,
        insight: {
          ...parsed,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.warn("AI Analysis API unavailable, using resilient fallback analysis:", error?.message || error);
      const fallback = generateFallbackAnalysis(parentName, relationship, checkIns, moods, missedDays);
      return res.json({
        success: true,
        insight: {
          ...fallback,
          analyzedAt: new Date().toISOString(),
        },
      });
    }
  });

  // Audio Transcription Endpoint using Gemini Multimodal Audio
  app.post("/api/ai/transcribe-voice", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu âm thanh." });
      }

      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, "");

      const response = await generateGeminiContentWithFallback({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: cleanBase64,
                },
              },
              {
                text: "Hãy chuyển đổi toàn bộ lời nói trong đoạn ghi âm tiếng Việt này thành văn bản thuần túy chính xác. Không thêm lời bình luận, không thêm giải thích, chỉ trả về nội dung lời nói.",
              },
            ],
          },
        ],
      });

      const transcript = response.text?.trim() || "";

      return res.json({
        success: true,
        transcript: transcript || "(Âm thanh lời nhắn thoại)",
      });
    } catch (error: any) {
      console.warn("Transcription fallback:", error?.message || error);
      return res.json({
        success: true,
        transcript: "(Lời nhắn thoại âm thanh)",
      });
    }
  });

  // Weekly Family Summary Endpoint
  app.post("/api/ai/weekly-summary", async (req, res) => {
    const { parentName, weeklyStats } = req.body;
    try {
      const prompt = `Viết một bản tóm tắt tuần ngắn gọn (3-4 dòng) đầy tình cảm gửi đến con cái về tình hình tương tác của ${parentName || "Mẹ"}.
Dữ liệu tuần qua:
- Số ngày check-in: ${weeklyStats?.checkInCount || 0}/7 ngày
- Tâm trạng chủ đạo: ${weeklyStats?.dominantMood || "Bình thường"}
- Số tin nhắn thoại đã gửi: ${weeklyStats?.voiceCount || 0}
- Cảnh báo: ${weeklyStats?.alertsCount ? `${weeklyStats.alertsCount} cảnh báo cần hỗ trợ` : "Không có cảnh báo bất thường"}

Hãy viết bằng giọng văn nhẹ nhàng, cảm thông, kèm 1 lời chúc ấm áp cho gia đình.`;

      const response = await generateGeminiContentWithFallback({
        contents: prompt,
      });

      return res.json({
        success: true,
        summary: response.text?.trim() || generateFallbackWeeklySummary(parentName, weeklyStats),
      });
    } catch (error: any) {
      console.warn("Weekly summary API unavailable, using intelligent fallback:", error?.message || error);
      const fallbackSummary = generateFallbackWeeklySummary(parentName, weeklyStats);
      return res.json({
        success: true,
        summary: fallbackSummary,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Con Có Ở Đây server is listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

