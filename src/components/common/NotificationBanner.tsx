import React from "react";
import { AlertRecord } from "../../types";
import { AlertTriangle, Phone, MapPin, CheckCircle2, Clock } from "lucide-react";
import { resolveAlert } from "../../services/checkInService";

interface NotificationBannerProps {
  alerts: AlertRecord[];
  currentUserId?: string;
  missedCheckIn?: boolean;
  parentName?: string;
  onCallParent?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  alerts,
  currentUserId,
  missedCheckIn,
  parentName = "Bố/Mẹ",
  onCallParent,
}) => {
  // Do NOT send/show emergency notification to oneself
  const activeAlerts = alerts.filter(
    (a) => a.status === "active" && (currentUserId ? a.parentId !== currentUserId : true)
  );

  if (activeAlerts.length === 0 && !missedCheckIn) {
    return null;
  }

  return (
    <>
      {/* Full Screen Emergency Overlay Modal for Active SOS Alerts */}
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-slate-900 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-[340px] sm:max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-slate-100">
            {/* Header text */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                Cần trợ giúp khẩn cấp
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {alert.parentName} cần hỗ trợ
              </h2>
              {alert.message && (
                <p className="text-xs text-slate-500 leading-relaxed pt-1 my-0">
                  "{alert.message}"
                </p>
              )}
            </div>

            {/* Location info if available */}
            {alert.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${alert.location.lat},${alert.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
              >
                <span>Xem vị trí trên Google Maps</span>
              </a>
            )}

            {/* Minimalist Action buttons */}
            <div className="space-y-2.5 pt-1">
              {onCallParent && (
                <button
                  type="button"
                  onClick={onCallParent}
                  className="w-full py-3.5 rounded-2xl bg-[#159447] hover:bg-[#12803c] text-white text-sm font-bold shadow-2xs active:scale-95 transition-all cursor-pointer border-0"
                >
                  Gọi ngay
                </button>
              )}

              <button
                type="button"
                onClick={() => resolveAlert(alert.id)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer border-0"
              >
                Đã an toàn
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Missed Check-In Warning Banner */}
      {missedCheckIn && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 sm:p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                {parentName} chưa check-in trong khung giờ hôm nay
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Có thể {parentName.toLowerCase()} đang bận hoặc chưa xem điện thoại. Bạn có thể gọi nhẹ nhàng thăm hỏi.
              </p>
            </div>
          </div>

          {onCallParent && (
            <button
              onClick={onCallParent}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              Gọi hỏi thăm
            </button>
          )}
        </div>
      )}
    </>
  );
};
