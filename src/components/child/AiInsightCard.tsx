import React from "react";
import { AiInsightRecord } from "../../types";
import { Sparkles, Calendar, RefreshCw, AlertCircle, CheckCircle2, PhoneCall } from "lucide-react";

interface AiInsightCardProps {
  insight: AiInsightRecord | null;
  parentName: string;
  relationship: string;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCalendarSync: (title?: string) => void;
  onCallParent?: () => void;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  insight,
  parentName,
  relationship,
  isLoading,
  onRefresh,
  onOpenCalendarSync,
  onCallParent,
}) => {
  return (
    <div className="bg-white border border-[#E6F0EB] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E6F0EB] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] flex items-center justify-center text-[#2EBD6E]">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            Gợi ý quan tâm & thói quen
          </h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs font-semibold text-[#2EBD6E] hover:text-emerald-700 flex items-center gap-1.5 disabled:opacity-50 p-1 rounded-lg hover:bg-[#E8F8F0] transition-colors"
          title="Phân tích lại"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Cập nhật</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#2EBD6E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Đang tổng hợp thông tin quan tâm {parentName}...</p>
        </div>
      ) : insight ? (
        <div className="space-y-4">
          {/* Status & Summary */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E6F0EB] space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  insight.anomalyDetected ? "bg-amber-500" : "bg-[#2EBD6E]"
                }`}
              />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {insight.anomalyDetected ? "Có điểm cần lưu ý" : "Trạng thái ổn định"}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {insight.summary}
            </p>
          </div>

          {/* Actionable Recommendation */}
          {insight.recommendations && insight.recommendations.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hành động gợi ý cho bạn:
              </span>
              <ul className="space-y-1.5">
                {insight.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-2xl bg-[#E8F8F0] text-emerald-950 text-xs sm:text-sm font-medium flex items-start gap-2 border border-[#DCF5E8]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2EBD6E] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onOpenCalendarSync(`Gọi hỏi thăm ${parentName}`)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-[#E6F0EB] hover:bg-[#E8F8F0] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#2EBD6E]" />
              <span>Đặt lịch Google Calendar</span>
            </button>
            {onCallParent && (
              <button
                onClick={onCallParent}
                className="px-4 py-2.5 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Gọi ngay</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-5 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Bấm "Cập nhật" để xem gợi ý chăm sóc dựa trên dữ liệu check-in của {parentName}.
          </p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white text-xs font-bold transition-colors shadow-xs"
          >
            Nhận gợi ý quan tâm
          </button>
        </div>
      )}
    </div>
  );
};
