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
          className="fixed inset-0 z-[9999] bg-rose-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-white animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="w-full max-w-md bg-white border-2 border-rose-500 rounded-3xl p-6 shadow-2xl text-slate-900 text-center space-y-5">
            {/* Siren Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-rose-100 text-[#C40C3B] flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
            </div>

            {/* Warning Header */}
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                Tín hiệu SOS khẩn cấp
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {alert.parentName.toUpperCase()} CẦN TRỢ GIÚP GẤP!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
                "{alert.message}"
              </p>
            </div>

            {/* Location info if available */}
            {alert.location && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center gap-2 text-xs font-semibold text-rose-900">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Vị trí: ({alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)})</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${alert.location.lat},${alert.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-rose-700 hover:text-rose-900 ml-1"
                >
                  Xem bản đồ
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              {onCallParent && (
                <button
                  type="button"
                  onClick={onCallParent}
                  className="w-full py-4 rounded-2xl bg-[#159447] hover:bg-[#12803c] text-white text-base font-bold flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all cursor-pointer border-0"
                >
                  <Phone className="w-5 h-5 fill-current" />
                  <span>Gọi cho {alert.parentName} ngay</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => resolveAlert(alert.id)}
                className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-600" />
                <span>Xác nhận an toàn / Đã xong</span>
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
