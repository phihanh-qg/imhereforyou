import React, { useState } from "react";
import { triggerEmergencyAlert } from "../../services/checkInService";
import { AlertTriangle, MapPin, CheckCircle2, X, Building2 } from "lucide-react";

interface EmergencyHelpModalProps {
  parentId: string;
  parentName: string;
  familyId: string;
  onClose: () => void;
  onAlertSent?: () => void;
  onOpenNearby?: () => void;
}

export const EmergencyHelpModal: React.FC<EmergencyHelpModalProps> = ({
  parentId,
  parentName,
  familyId,
  onClose,
  onAlertSent,
  onOpenNearby,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>("");
  const [includeLocation, setIncludeLocation] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirmHelp = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    let locationData: { lat: number; lng: number; address?: string } | null = null;

    if (includeLocation && "geolocation" in navigator) {
      try {
        const pos: GeolocationPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true,
            maximumAge: 30000,
          });
        });
        locationData = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      } catch (locErr) {
        console.warn("Could not retrieve precise location, trying low accuracy:", locErr);
        try {
          const posLow: GeolocationPosition = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4000,
              enableHighAccuracy: false,
              maximumAge: 60000,
            });
          });
          locationData = {
            lat: posLow.coords.latitude,
            lng: posLow.coords.longitude,
          };
        } catch (e2) {
          console.warn("Geolocation unavailable:", e2);
        }
      }
    }

    try {
      const message =
        customNote.trim() || `${parentName} cần sự giúp đỡ của con và gia đình ngay lúc này.`;
      await triggerEmergencyAlert(parentId, parentName, familyId, message, locationData);
      setSentSuccess(true);
      if (onAlertSent) onAlertSent();
    } catch (err: any) {
      console.error("Emergency trigger error:", err);
      setErrorMsg("Không thể gửi cảnh báo. Vui lòng gọi trực tiếp bằng điện thoại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 w-full max-w-[390px] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2 text-[#C40C3B] font-bold text-base">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            <span>Trợ giúp khẩn cấp</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-3 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Đã thông báo cho người thân
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Hệ thống đã gửi thông báo khẩn cấp đến toàn bộ gia đình và vòng kết nối tin cậy.
              </p>
            </div>

            {onOpenNearby && (
              <button
                type="button"
                onClick={onOpenNearby}
                className="w-full py-3 rounded-2xl bg-[#F0F4F8] hover:bg-[#E5ECF2] text-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>Bệnh viện &amp; nhà thuốc</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Center Warning Emblem */}
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-50/80 border border-rose-100/60 flex items-center justify-center text-[#C40C3B]">
                <AlertTriangle className="w-6 h-6 stroke-[2]" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 pt-1">
                Thông báo người thân?
              </h3>
              <p className="text-xs text-slate-500">
                Gửi thông báo ngay lập tức.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* Note input */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                GHI CHÚ THÊM <span className="font-normal text-slate-400">(TUỲ CHỌN)</span>
              </label>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C40C3B]/20 focus:border-[#C40C3B] resize-none transition-all"
              />
            </div>

            {/* Location Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="emergency-include-location"
                type="checkbox"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="emergency-include-location"
                className="flex items-center gap-1 text-xs font-medium text-slate-700 cursor-pointer select-none"
              >
                <MapPin className="w-3.5 h-3.5 text-[#C40C3B] stroke-[2.2]" />
                <span>Kèm vị trí</span>
              </label>
            </div>

            {/* 2 Main Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/2 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmHelp}
                disabled={submitting}
                className="w-1/2 py-3 rounded-2xl bg-[#C40C3B] hover:bg-[#A80A32] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? "Đang gửi..." : "Xác nhận"}
              </button>
            </div>

            {/* Hospital & Pharmacy Button */}
            {onOpenNearby && (
              <button
                type="button"
                onClick={onOpenNearby}
                className="w-full py-3 rounded-2xl bg-[#F0F4F8] hover:bg-[#E4ECF2] active:bg-[#D9E3EA] text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-600 stroke-[1.8]" />
                <span>Bệnh viện &amp; nhà thuốc</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

