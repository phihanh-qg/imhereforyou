import React, { useEffect, useState, useMemo } from "react";
import {
  AiInsightRecord,
  CheckInRecord,
  MoodRecord,
  VoiceMessageRecord,
  FamilyMember,
} from "../../types";
import { fetchAiFamilyInsight } from "../../services/aiService";
import {
  Sparkles,
  X,
  RefreshCw,
  Calendar,
  PhoneCall,
  CheckCircle2,
  Users,
  User,
  Clock,
  MessageSquare,
  Smile,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  familyId: string;
  currentUserId?: string;
  checkIns: CheckInRecord[];
  moods: MoodRecord[];
  voiceMessages: VoiceMessageRecord[];
  onOpenCalendarSync: (title?: string) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  members,
  familyId,
  currentUserId,
  checkIns,
  moods,
  voiceMessages,
  onOpenCalendarSync,
}) => {
  // Filter selectable targets (prefer parents/elderly first, then other members)
  const selectableMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    // Sort so parents/elderly come first, then other relatives
    return [...members].sort((a, b) => {
      if (a.role === "parent" && b.role !== "parent") return -1;
      if (a.role !== "parent" && b.role === "parent") return 1;
      return 0;
    });
  }, [members]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [insight, setInsight] = useState<AiInsightRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize selected member when opened
  useEffect(() => {
    if (isOpen && selectableMembers.length > 0) {
      if (!selectedMemberId || !selectableMembers.some((m) => m.userId === selectedMemberId)) {
        setSelectedMemberId(selectableMembers[0].userId);
      }
    }
  }, [isOpen, selectableMembers]);

  const currentTarget = useMemo(() => {
    return (
      selectableMembers.find((m) => m.userId === selectedMemberId) ||
      selectableMembers[0] ||
      null
    );
  }, [selectableMembers, selectedMemberId]);

  const targetName = currentTarget?.displayName || "Người thân";
  const targetRelationship = currentTarget?.relationship || (currentTarget?.role === "parent" ? "Bố/Mẹ" : "Con cái");

  // Specific data for the chosen target
  const targetCheckIns = useMemo(() => {
    if (!currentTarget) return [];
    return checkIns.filter(
      (c) =>
        c.userId === currentTarget.userId ||
        c.parentId === currentTarget.userId ||
        (!c.userId && currentTarget.role === "parent")
    );
  }, [checkIns, currentTarget]);

  const targetMoods = useMemo(() => {
    if (!currentTarget) return [];
    return moods.filter(
      (m) =>
        m.userId === currentTarget.userId ||
        m.parentId === currentTarget.userId ||
        (!m.userId && currentTarget.role === "parent")
    );
  }, [moods, currentTarget]);

  const targetVoiceMessages = useMemo(() => {
    if (!currentTarget) return [];
    return voiceMessages.filter((v) => v.senderId === currentTarget.userId);
  }, [voiceMessages, currentTarget]);

  const weeklyCheckedDays = useMemo(() => {
    return targetCheckIns.filter((c) => {
      const diff = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 3600 * 24);
      return diff <= 7;
    }).length;
  }, [targetCheckIns]);

  const runAnalysis = async () => {
    if (!familyId || !currentTarget) return;
    setIsLoading(true);
    try {
      const voiceTranscripts = targetVoiceMessages
        .filter((v) => v.transcript)
        .slice(0, 5)
        .map((v) => v.transcript!);

      const missedDaysCount = Math.max(0, 7 - weeklyCheckedDays);

      const res = await fetchAiFamilyInsight(
        familyId,
        currentTarget.userId,
        targetName,
        targetRelationship,
        targetCheckIns.slice(0, 14),
        targetMoods.slice(0, 14),
        voiceTranscripts,
        missedDaysCount,
        { startHour: 7, endHour: 10 }
      );
      if (res) {
        setInsight(res);
      }
    } catch (err) {
      console.error("Run analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run analysis whenever target changes
  useEffect(() => {
    if (isOpen && currentTarget) {
      runAnalysis();
    }
  }, [isOpen, selectedMemberId]);

  if (!isOpen) return null;

  const handleCallTarget = () => {
    window.open("tel:0900000000", "_self");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Phân tích & gợi ý quan tâm (AI)
              </h2>
              <p className="text-xs text-slate-500">
                Chọn người thân để xem báo cáo sức khỏe và cảm xúc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Selector Strip */}
        <div className="px-5 sm:px-6 py-3 bg-[#fdfefe] border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#159447]" />
              <span>Chọn thành viên cần phân tích:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {selectableMembers.length} thành viên
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {selectableMembers.map((m) => {
              const isSelected = m.userId === selectedMemberId;
              const roleDisplay = m.relationship || (m.role === "parent" ? "Bố/Mẹ" : "Con cái");
              const isElderly = m.role === "parent";

              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setSelectedMemberId(m.userId)}
                  className={`px-3.5 py-2 rounded-2xl border text-left flex items-center gap-2.5 shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#E8F8F0] border-[#28b463] text-[#159447] shadow-xs font-bold ring-2 ring-[#28b463]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-medium"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                      isSelected
                        ? "bg-[#159447] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs leading-tight">
                    <span className="block font-bold truncate max-w-[120px]">
                      {m.displayName}
                    </span>
                    <span
                      className={`text-[10px] block ${
                        isSelected ? "text-[#159447]/80" : "text-slate-400"
                      }`}
                    >
                      {roleDisplay}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Metrics for the selected target */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-slate-100 text-center">
              <span className="text-[11px] sm:text-xs text-slate-500 block mb-1">
                Điểm danh tuần
              </span>
              <span className="text-base sm:text-lg font-black text-[#159447]">
                {weeklyCheckedDays}/7 ngày
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-slate-100 text-center">
              <span className="text-[11px] sm:text-xs text-slate-500 block mb-1">
                Cảm xúc gần nhất
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block mt-0.5">
                {targetMoods[0]?.moodLabel || "Bình an"}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-slate-100 text-center">
              <span className="text-[11px] sm:text-xs text-slate-500 block mb-1">
                Tin nhắn thoại
              </span>
              <span className="text-base sm:text-lg font-black text-sky-600">
                {targetVoiceMessages.length} tin
              </span>
            </div>
          </div>

          {/* AI Result Card */}
          {isLoading ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-[#28b463] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                AI đang phân tích thói quen và điểm danh của <b>{targetName}</b>...
              </p>
              <p className="text-xs text-slate-400">
                Đang đối chiếu lịch sử check-in, cảm xúc và tin nhắn thoại
              </p>
            </div>
          ) : insight ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-[#F4F9F6] border border-[#DCF5E8] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        insight.status === "alert" || insight.status === "attention"
                          ? "bg-amber-500"
                          : "bg-[#159447]"
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {insight.status === "alert" || insight.status === "attention"
                        ? "Điểm lưu ý trong sinh hoạt"
                        : "Thói quen sinh hoạt ổn định"}
                    </span>
                  </div>
                  <button
                    onClick={runAnalysis}
                    className="text-xs font-semibold text-[#159447] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Phân tích lại</span>
                  </button>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {insight.summary}
                </p>
              </div>

              {/* Observed Changes / Key Highlights */}
              {insight.changes && insight.changes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ghi nhận quan sát ({targetName}):
                  </h4>
                  <div className="space-y-1.5">
                    {insight.changes.map((change, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 text-xs sm:text-sm flex items-start gap-2"
                      >
                        <span className="text-[#159447] font-bold mt-0.5">•</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {insight.recommendation && (
                <div className="p-4 rounded-2xl bg-[#fdf9f4] border border-[#f7e6ce] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#b26a15] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>Lời khuyên tương tác:</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-[#78350f] leading-relaxed">
                    {insight.recommendation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Chưa có bản phân tích cho {targetName}. Bấm nút bên dưới để bắt đầu.
              </p>
              <button
                onClick={runAnalysis}
                className="px-5 py-2.5 rounded-2xl bg-[#159447] hover:bg-[#127a3a] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                Phân tích ngay
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onOpenCalendarSync(`Gọi điện hỏi thăm ${targetName}`);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-[#159447]" />
            <span>Đặt lịch Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={handleCallTarget}
            className="py-3 px-5 rounded-2xl bg-[#159447] hover:bg-[#127a3a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Gọi ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
