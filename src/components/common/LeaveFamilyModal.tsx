import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, AlertTriangle, X } from "lucide-react";

interface LeaveFamilyModalProps {
  familyName?: string;
  onClose: () => void;
}

export const LeaveFamilyModal: React.FC<LeaveFamilyModalProps> = ({
  familyName = "Gia đình",
  onClose,
}) => {
  const { leaveCurrentFamily } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveCurrentFamily();
      onClose();
    } catch (err) {
      console.error("Error leaving family:", err);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">Rời nhóm gia đình</h3>
              <span className="text-xs text-slate-500">{familyName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs sm:text-sm leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Bạn có chắc chắn muốn rời nhóm gia đình này không?</p>
            <p className="mt-1 text-xs text-amber-800">
              Nếu bạn vào nhầm nhóm, sau khi rời bạn sẽ quay lại màn hình chọn để tạo gia đình mới hoặc nhập mã mời của gia đình khác.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLeaving}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
          >
            Ở lại nhóm
          </button>
          <button
            type="button"
            onClick={handleConfirmLeave}
            disabled={isLeaving}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLeaving ? "Đang rời nhóm..." : "Xác nhận rời gia đình"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
