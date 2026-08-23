import React from "react";
import { ActiveMeeting } from "../../types";
import { endFamilyMeeting, leaveFamilyMeeting } from "../../services/meetingService";
import { Video, X, Users, LogOut, PhoneOff } from "lucide-react";

interface ActiveMeetingBannerProps {
  meeting: ActiveMeeting | null;
  familyId: string;
  currentUserId: string;
  onJoin?: () => void;
}

export const ActiveMeetingBanner: React.FC<ActiveMeetingBannerProps> = ({
  meeting,
  familyId,
  currentUserId,
  onJoin,
}) => {
  if (!meeting || !meeting.isOpen) return null;

  const participants = meeting.participants || [];
  const isParticipant = participants.some((p) => p.userId === currentUserId);
  const participantCount = participants.length;

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    } else if (meeting.meetUrl) {
      window.open(meeting.meetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!familyId || !currentUserId) return;
    await leaveFamilyMeeting(familyId, currentUserId);
  };

  const handleEnd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!familyId) return;
    await endFamilyMeeting(familyId);
  };

  const participantNames = participants
    .map((p) => (p.userId === currentUserId ? "Bạn" : p.displayName || "Thành viên"))
    .join(", ");

  return (
    <div className="w-full flex items-center justify-center my-1.5 animate-in fade-in duration-200">
      <div
        onClick={handleJoin}
        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300/80 text-emerald-900 text-xs sm:text-[13px] font-medium shadow-xs transition-all active:scale-98 cursor-pointer select-none max-w-full"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <Video className="w-4 h-4 text-[#159447] shrink-0" />
        
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-[#159447] shrink-0">Google Meet đang mở:</span>
          <span className="truncate text-slate-700 text-xs max-w-[140px] sm:max-w-[220px]">
            {participantCount > 0 ? participantNames : "Phòng gọi thoại"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <button
            type="button"
            onClick={handleJoin}
            className="text-[11px] font-bold text-white bg-[#159447] hover:bg-[#12803c] px-2.5 py-1 rounded-xl whitespace-nowrap shadow-2xs cursor-pointer border-0 transition-colors"
          >
            {isParticipant ? "Mở Meet" : "Vào ngay"}
          </button>

          {isParticipant && (
            <button
              type="button"
              onClick={handleLeave}
              title="Rời khỏi phòng gọi"
              aria-label="Rời cuộc gọi"
              className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-slate-200 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Rời</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEnd}
            title="Đóng và tắt phòng gọi video cho cả nhà"
            aria-label="Tắt phòng gọi"
            className="px-2 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ml-0.5 shadow-2xs"
          >
            <PhoneOff className="w-3 h-3" />
            <span>Tắt phòng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
