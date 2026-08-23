import React, { useState } from "react";
import { createDirectCalendarEvent } from "../../services/googleWorkspaceService";
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  X,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface CalendarDirectCreateModalProps {
  parentName: string;
  defaultActionTitle?: string;
  onClose: () => void;
}

export const CalendarDirectCreateModal: React.FC<CalendarDirectCreateModalProps> = ({
  parentName = "Mẹ",
  defaultActionTitle,
  onClose,
}) => {
  const [eventTitle, setEventTitle] = useState<string>(
    defaultActionTitle || `Gọi điện thăm ${parentName} (Con Có Ở Đây)`
  );
  const [selectedDay, setSelectedDay] = useState<string>("SU"); // Sunday
  const [selectedTime, setSelectedTime] = useState<string>("20:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "once">("weekly");
  const [includeMeet, setIncludeMeet] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [createdResult, setCreatedResult] = useState<{
    htmlLink: string;
    meetLink?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getTargetDate = () => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);

    const dayMap: { [key: string]: number } = {
      SU: 0,
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
    };
    const targetDay = dayMap[selectedDay] ?? 0;
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const handleCreateDirectEvent = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const startTime = getTargetDate();
      const description = `Cuộc gọi hỏi thăm định kỳ cùng ${parentName}.\nỨng dụng kết nối gia đình: Con Có Ở Đây (I'm Here For You).`;
      const recurrence =
        recurrenceType === "weekly"
          ? [`RRULE:FREQ=WEEKLY;BYDAY=${selectedDay}`]
          : undefined;

      const result = await createDirectCalendarEvent({
        title: eventTitle,
        description,
        startTime,
        durationMinutes,
        recurrence,
        createMeetLink: includeMeet,
      });

      setCreatedResult(result);
    } catch (err: any) {
      console.error("Direct Calendar creation error:", err);
      setErrorMsg(
        err?.message ||
          "Không thể tạo lịch trực tiếp. Vui lòng xác thực tài khoản Google với quyền Calendar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-4 sm:p-5 shadow-xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm sm:text-base">Tạo lịch trực tiếp vào Google Calendar</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Sử dụng Google Calendar API &amp; Google Meet
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdResult ? (
          <div className="space-y-3.5 py-2 animate-in fade-in zoom-in-95">
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                <span>Đã ghi sự kiện trực tiếp vào Google Calendar!</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Lịch nhắc gọi {parentName} đã được đồng bộ an toàn vào tài khoản Google của bạn.
              </p>

              {createdResult.meetLink && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-900 block mb-1">
                    Link phòng họp Google Meet:
                  </span>
                  <a
                    href={createdResult.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-emerald-300 text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mở Google Meet</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={createdResult.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Xem trên Calendar</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Tiêu đề sự kiện
              </label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Ngày trong tuần
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="SU">Chủ Nhật hàng tuần</option>
                  <option value="SA">Thứ Bảy hàng tuần</option>
                  <option value="FR">Thứ Sáu hàng tuần</option>
                  <option value="WE">Thứ Tư hàng tuần</option>
                  <option value="MO">Thứ Hai hàng tuần</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Giờ nhắc nhở
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Recurrence & Meet Option */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="recurDirect"
                    checked={recurrenceType === "weekly"}
                    onChange={() => setRecurrenceType("weekly")}
                    className="text-indigo-600 focus:ring-indigo-600"
                  />
                  <span>Lặp lại hàng tuần</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="recurDirect"
                    checked={recurrenceType === "once"}
                    onChange={() => setRecurrenceType("once")}
                    className="text-indigo-600 focus:ring-indigo-600"
                  />
                  <span>Chỉ một lần</span>
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeMeet}
                  onChange={(e) => setIncludeMeet(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Video className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tự động đính kèm đường link Google Meet để gọi video</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreateDirectEvent}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kết nối Calendar API &amp; tạo lịch...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tạo lịch gọi vào Google Calendar ngay</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
