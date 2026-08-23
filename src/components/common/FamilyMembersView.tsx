import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Users, Phone, Copy, Check, ShieldCheck, UserPlus, Heart, Clock } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface FamilyMembersViewProps {
  parentName?: string;
  isParentView?: boolean;
}

export const FamilyMembersView: React.FC<FamilyMembersViewProps> = ({
  parentName = "Gia đình",
  isParentView = false,
}) => {
  const { user, profile, family, members } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteCode = (family?.inviteCode || "").trim().toUpperCase();

  const handleCopyInviteCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);

    if (family?.id) {
      setDoc(doc(db, "familyInvitations", inviteCode), {
        familyId: family.id,
        inviteCode: inviteCode,
        name: family.name,
        createdAt: family.createdAt || new Date().toISOString(),
        createdBy: family.createdBy || "",
      }).catch(() => {});
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col flex-1 h-full min-h-0 overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
              Người thân trong gia đình
            </h3>
            <span className="text-xs text-slate-500">
              {family?.name || "Tổ ấm gia đình"} • {members.length} thành viên
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F8FAF9]/60">
        {/* Invite Code Card */}
        {inviteCode && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#159447] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Mã kết nối gia đình</span>
              </div>
              <p className="text-xs text-slate-600">
                Gửi mã này cho con cháu hoặc người thân để cùng vào nhóm gia đình:
              </p>
              <div className="font-mono text-lg sm:text-xl font-black text-slate-800 tracking-wider pt-0.5">
                {inviteCode}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteCode}
              className="px-4 py-2.5 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-2xs shrink-0 self-start sm:self-auto"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao chép mã</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Member List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Danh sách thành viên ({members.length})
          </h4>

          <div className="grid grid-cols-1 gap-3">
            {members.map((member) => {
              const isCurrentUser = member.userId === user?.uid;
              const isParent = member.role === "parent";
              const relationshipLabel =
                member.relationship || (isParent ? "Bố Mẹ" : "Con cái");

              return (
                <div
                  key={member.id || member.userId}
                  className={`p-4 rounded-2xl bg-white border transition-all flex items-center justify-between gap-3 ${
                    isCurrentUser
                      ? "border-emerald-200 shadow-2xs ring-1 ring-emerald-500/10"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isParent
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {member.displayName?.charAt(0)?.toUpperCase() || "N"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {member.displayName || "Thành viên"}
                        </span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#159447] text-[10px] font-bold shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600">
                          {relationshipLabel}
                        </span>
                        <span>•</span>
                        <span>{isParent ? "Người lớn tuổi" : "Con cháu"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact button */}
                  {member.phoneNumber && (
                    <a
                      href={`tel:${member.phoneNumber}`}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E8F8F0] text-slate-600 hover:text-[#159447] border border-slate-200/80 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                      title={`Gọi cho ${member.displayName}`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden sm:inline">Gọi điện</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
