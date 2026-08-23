import React from "react";
import { AlertRecord } from "../../types";
import { AlertTriangle, Phone, MapPin, CheckCircle2, Clock } from "lucide-react";
import { resolveAlert } from "../../services/checkInService";

interface NotificationBannerProps {
  alerts: AlertRecord[];
  missedCheckIn?: boolean;
  parentName?: string;
  onCallParent?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  alerts,
  missedCheckIn,
  parentName = "Bố/Mẹ",
  onCallParent,
}) => {
  const activeAlerts = alerts.filter((a) => a.status === "active");

  if (activeAlerts.length === 0 && !missedCheckIn) {
    return null;
  }

  return (
    <div className="space-y-2.5 mb-4">
      {/* Active Help Requests */}
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-rose-50/90 border border-rose-300 rounded-xl p-3.5 sm:p-4 shadow-xs text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-900 text-sm sm:text-base">
                  CẢNH BÁO: {alert.parentName} CẦN TRỢ GIÚP
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-900 font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Khẩn cấp
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-800 mt-0.5 leading-relaxed">{alert.message}</p>
              {alert.location && (
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-rose-900 font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>
                    Vị trí: ({alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)})
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${alert.location.lat},${alert.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-rose-900 font-bold hover:text-rose-950 ml-1"
                  >
                    Xem trên Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {onCallParent && (
              <button
                onClick={onCallParent}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Gọi ngay
              </button>
            )}
            <button
              onClick={() => resolveAlert(alert.id)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-700" />
              Đã xử lý
            </button>
          </div>
        </div>
      ))}

      {/* Missed Check-In Warning */}
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
    </div>
  );
};
