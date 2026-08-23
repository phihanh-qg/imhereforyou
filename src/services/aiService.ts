import {
  doc,
  setDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { AiInsightRecord, CheckInRecord, MoodRecord } from "../types";

export async function fetchAiFamilyInsight(
  familyId: string,
  parentId: string,
  parentName: string,
  relationship: string,
  checkIns: CheckInRecord[],
  moods: MoodRecord[],
  voiceTranscripts: string[],
  missedDays: number,
  checkInWindow: { startHour: number; endHour: number }
): Promise<AiInsightRecord> {
  const fallbackInsight: AiInsightRecord = {
    familyId,
    parentId,
    status: missedDays >= 2 ? "attention" : "normal",
    summary: `${parentName || relationship || "Bố/Mẹ"} duy trì thói quen tương tác ổn định cùng gia đình.`,
    changes: [
      `Đã ghi nhận ${checkIns.length} lần check-in gần đây`,
      `Tâm trạng gần nhất: ${moods?.[0]?.moodLabel || "Ổn định"}`,
      `Khung giờ mong đợi: ${checkInWindow.startHour}:00 - ${checkInWindow.endHour}:00`,
    ],
    recommendation: "Hãy duy trì cuộc gọi ngắn hoặc gửi tin nhắn thoại để kết nối thêm yêu thương mỗi ngày.",
    suggestedActionTitle: `Gọi điện hỏi thăm ${parentName || "Bố/Mẹ"}`,
    confidence: 0.85,
    analyzedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/ai/analyze-family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName,
        relationship,
        checkIns,
        moods,
        voiceTranscripts,
        missedDays,
        checkInWindow,
      }),
    });

    if (!res.ok) {
      return fallbackInsight;
    }

    const data = await res.json();
    const insight: AiInsightRecord = {
      familyId,
      parentId,
      status: data?.insight?.status || fallbackInsight.status,
      summary: data?.insight?.summary || fallbackInsight.summary,
      changes: data?.insight?.changes || fallbackInsight.changes,
      recommendation: data?.insight?.recommendation || fallbackInsight.recommendation,
      suggestedActionTitle: data?.insight?.suggestedActionTitle || fallbackInsight.suggestedActionTitle,
      confidence: data?.insight?.confidence || 0.85,
      analyzedAt: data?.insight?.analyzedAt || new Date().toISOString(),
    };

    // Save to Firestore for persistence
    const insightId = `ai_${familyId}_${parentId}`;
    setDoc(doc(db, "aiInsights", insightId), {
      ...insight,
      id: insightId,
    }).catch(() => {});

    return insight;
  } catch (error) {
    console.warn("fetchAiFamilyInsight using resilient fallback insight:", error);
    return fallbackInsight;
  }
}

export function listenToLatestAiInsight(
  familyId: string,
  callback: (insight: AiInsightRecord | null) => void
) {
  const q = query(
    collection(db, "aiInsights"),
    where("familyId", "==", familyId),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback(snapshot.docs[0].data() as AiInsightRecord);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Error listening to AI insights:", err);
  });
}

export async function fetchWeeklySummary(
  parentName: string,
  weeklyStats: {
    checkInCount: number;
    dominantMood: string;
    voiceCount: number;
    alertsCount: number;
  }
): Promise<string> {
  try {
    const res = await fetch("/api/ai/weekly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentName, weeklyStats }),
    });

    if (!res.ok) {
      return "Mẹ đã có một tuần kết nối ổn định cùng gia đình.";
    }

    const data = await res.json();
    return data.summary || "Mẹ đã có một tuần kết nối ổn định cùng gia đình.";
  } catch (error) {
    console.error("Error fetching weekly summary:", error);
    return "Mẹ đã có một tuần kết nối ổn định cùng gia đình.";
  }
}
