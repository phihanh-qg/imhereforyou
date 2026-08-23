import React from "react";
import { CheckInRecord, MoodRecord } from "../../types";
import { Calendar, CheckCircle2, AlertCircle, Smile, Meh, Frown, Sparkles, Check } from "lucide-react";

interface CheckInHistoryViewProps {
  checkIns: CheckInRecord[];
  moods: MoodRecord[];
  parentName: string;
}

export const CheckInHistoryView: React.FC<CheckInHistoryViewProps> = ({
  checkIns,
  moods,
  parentName = "Mẹ",
}) => {
  // Generate past 7 days array
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const dayName = i === 6 ? "Hôm nay" : d.toLocaleDateString("vi-VN", { weekday: "short" });
    const formatted = `${d.getDate()}/${d.getMonth() + 1}`;

    const checkIn = checkIns.find((c) => c.dateStr === dateStr);
    const mood = moods.find((m) => m.dateStr === dateStr);

    return {
      dateStr,
      dayName,
      formatted,
      hasCheckIn: !!checkIn,
      checkInTime: checkIn ? new Date(checkIn.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
      mood: mood?.mood || null,
      moodLabel: mood?.moodLabel || null,
    };
  });

  const checkedCount = past7Days.filter((d) => d.hasCheckIn).length;
  const reliability = Math.round((checkedCount / 7) * 100);

  return (
    <div className="space-y-4">
      {/* 7-Day Quick Overview Grid */}
      <div className="bg-white border border-[#E6F0EB] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6F0EB] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Tần suất check-in 7 ngày gần nhất
            </h3>
          </div>
          <div className="text-xs font-bold px-3 py-1 bg-[#E8F8F0] text-emerald-950 border border-[#DCF5E8] rounded-full self-start sm:self-auto">
            {checkedCount}/7 ngày ({reliability}% đều đặn)
          </div>
        </div>

        {/* 7 Day Blocks */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
          {past7Days.map((day) => (
            <div
              key={day.dateStr}
              className={`p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-between min-h-[100px] transition-all ${
                day.hasCheckIn
                  ? "bg-[#E8F8F0]/70 border-[#DCF5E8]"
                  : "bg-[#F8FAF9] border-slate-200 text-slate-400"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                {day.dayName}
              </span>
              <span className="text-[11px] text-slate-400">{day.formatted}</span>

              <div className="my-1">
                {day.hasCheckIn ? (
                  <div className="w-7 h-7 rounded-full bg-[#159447] text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs mx-auto">
                    —
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-500 font-medium">
                {day.checkInTime || "Chưa gửi"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* History Log Feed */}
      <div className="bg-white border border-[#E6F0EB] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-[#E6F0EB] pb-3">
          Nhật ký hoạt động chi tiết
        </h3>

        {checkIns.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu check-in trong quá khứ.</p>
        ) : (
          <div className="space-y-2.5">
            {checkIns.slice(0, 15).map((record) => (
              <div
                key={record.id}
                className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E6F0EB] flex items-center justify-between hover:bg-[#E8F8F0]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {record.userName || parentName} đã báo an tâm
                    </span>
                    <span className="text-xs text-slate-500 italic">"{record.note || "Tôi vẫn ổn"}"</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 block">
                    {new Date(record.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(record.timestamp).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
