import React, { useState } from "react";
import { Video, Link2, X, CheckCircle2, ArrowRight } from "lucide-react";
import { updateFamilyFixedMeetUrl, normalizeGoogleMeetUrl } from "../../services/meetingService";
import { createDirectCalendarEvent } from "../../services/googleWorkspaceService";

interface GoogleMeetSetupModalProps {
  familyId: string;
  currentMeetUrl?: string;
  onClose: () => void;
  onSavedAndJoin: (savedUrl: string) => void;
}

export const GoogleMeetSetupModal: React.FC<GoogleMeetSetupModalProps> = ({
  familyId,
  currentMeetUrl = "",
  onClose,
  onSavedAndJoin,
}) => {
  const [urlInput, setUrlInput] = useState<string>(currentMeetUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 1-Click Auto Create Google Meet room
  const handleAutoCreateGoogleMeet = async () => {
    setIsAutoCreating(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const eventResult = await createDirectCalendarEvent({
        title: "Phòng Gọi Video Gia Đình (Google Meet)",
        description: "Phòng gọi video Google Meet chính thức cố định của gia đình.",
        startTime: new Date(),
        durationMinutes: 60,
        createMeetLink: true,
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA"],
      });

      if (eventResult.meetLink) {
        const normalized = normalizeGoogleMeetUrl(eventResult.meetLink);
        if (normalized) {
          setUrlInput(normalized);
          setSuccessMessage("Đã tạo phòng thành công!");
          const saved = await updateFamilyFixedMeetUrl(familyId, normalized);
          setTimeout(() => {
            onSavedAndJoin(saved);
          }, 600);
          return;
        }
      }

      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      setErrorMessage("Đã mở Google Meet, hãy sao chép link dán vào ô bên dưới.");
    } catch (err: any) {
      console.warn("Auto create meet failed:", err);
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      setErrorMessage("Đã mở Google Meet, hãy dán link vào ô bên dưới!");
    } finally {
      setIsAutoCreating(false);
    }
  };

  const handleSaveAndJoin = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage("Vui lòng nhập hoặc dán link Google Meet");
      return;
    }

    const normalized = normalizeGoogleMeetUrl(trimmed);
    if (!normalized) {
      setErrorMessage("Link không đúng định dạng Google Meet");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const saved = await updateFamilyFixedMeetUrl(familyId, normalized);
      onSavedAndJoin(saved);
    } catch (err) {
      console.error("Save Meet URL error:", err);
      setErrorMessage("Lỗi khi lưu link. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6F0EB] w-full max-w-md rounded-3xl shadow-xl text-left flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6F0EB] px-5 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Google Meet gia đình</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-700">
          
          {/* Nút Tạo phòng ngay */}
          <button
            type="button"
            onClick={handleAutoCreateGoogleMeet}
            disabled={isAutoCreating}
            className="w-full py-3 px-4 rounded-2xl bg-[#159447] hover:bg-[#12803c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer border-0 disabled:opacity-60"
          >
            <span>{isAutoCreating ? "Đang tạo phòng..." : "Tạo phòng ngay"}</span>
          </button>

          {/* Phân cách hoặc */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute">hoặc nhập link</span>
          </div>

          {/* Ô nhập link */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#159447] focus:ring-2 focus:ring-[#159447]/20 outline-none text-xs sm:text-sm font-mono text-slate-800 transition-all bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveAndJoin}
              disabled={isSaving || isAutoCreating || !urlInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-0 disabled:opacity-40"
            >
              <span>{isSaving ? "Đang lưu..." : "Lưu & Vào phòng"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs text-red-600 font-medium px-1">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};
