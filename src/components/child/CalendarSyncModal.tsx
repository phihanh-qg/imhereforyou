import React, { useState } from "react";
import { createGoogleCalendarUrl, downloadIcsFile } from "../../services/calendarService";
import { Calendar, Clock, Download, ExternalLink, X, Check } from "lucide-react";

interface CalendarSyncModalProps {
  parentName: string;
  defaultActionTitle?: string;
  onClose: () => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  parentName = "Mẹ",
  defaultActionTitle,
  onClose,
}) => {
  const [eventTitle, setEventTitle] = useState<string>(
    defaultActionTitle || `Gọi điện hỏi thăm ${parentName}`
  );
  const [selectedDay, setSelectedDay] = useState<string>("SU"); // Sunday
  const [selectedTime, setSelectedTime] = useState<string>("20:00");
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "once">("weekly");
  const [synced, setSynced] = useState<boolean>(false);

  const getTargetDate = () => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);

    // If day is specified for weekly (0=Sun, 6=Sat)
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

  const handleOpenGoogleCalendar = () => {
    const startDate = getTargetDate();
    const details = `Thời gian dành riêng để gọi điện tâm sự và hỏi thăm sức khỏe cùng ${parentName}.\nỨng dụng Con Có Ở Đây (I'm Here For You).`;
    const recurrence = recurrenceType === "weekly" ? `RRULE:FREQ=WEEKLY;BYDAY=${selectedDay}` : undefined;

    const url = createGoogleCalendarUrl({
      title: eventTitle,
      details,
      startDate,
      recurrence,
    });

    window.open(url, "_blank");
    setSynced(true);
  };

  const handleDownloadIcs = () => {
    const startDate = getTargetDate();
    const details = `Thời gian dành riêng để gọi điện tâm sự và hỏi thăm sức khỏe cùng ${parentName}.\nỨng dụng Con Có Ở Đây.`;
    downloadIcsFile({
      title: eventTitle,
      details,
      startDate,
    });
    setSynced(true);
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
            <span>Đặt lịch nhắc gọi {parentName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Tiêu đề lịch nhắc
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Ngày trong tuần
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
              <div className="relative">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="recur"
                checked={recurrenceType === "weekly"}
                onChange={() => setRecurrenceType("weekly")}
                className="text-indigo-600 focus:ring-indigo-600"
              />
              <span>Lặp lại hàng tuần</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="recur"
                checked={recurrenceType === "once"}
                onChange={() => setRecurrenceType("once")}
                className="text-indigo-600 focus:ring-indigo-600"
              />
              <span>Chỉ lần tới</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleOpenGoogleCalendar}
            className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở &amp; Thêm vào Google Calendar
          </button>

          <button
            onClick={handleDownloadIcs}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Tải file lịch .ICS (cho Apple Calendar, Outlook)
          </button>
        </div>

        {synced && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã tạo sự kiện lịch nhắc gọi {parentName}!</span>
          </div>
        )}
      </div>
    </div>
  );
};
