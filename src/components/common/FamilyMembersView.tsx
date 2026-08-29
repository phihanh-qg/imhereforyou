import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FamilyMember } from "../../types";
import {
  Users,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  UserPlus,
  X,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { removeUndefinedFields, removeMemberFromFamily } from "../../services/familyService";
import { GoogleContactsPickerModal } from "../child/GoogleContactsPickerModal";

interface FamilyMembersViewProps {
  parentName?: string;
  isParentView?: boolean;
}

export const FamilyMembersView: React.FC<FamilyMembersViewProps> = ({
  parentName = "Gia đình",
  isParentView = false,
}) => {
  const { user, profile, family, members, refreshProfile } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactsPicker, setShowContactsPicker] = useState(false);

  // Quick manual add state
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("Con cái");
  const [newPhone, setNewPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

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

  const handleAddMemberManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !family?.id) return;
    setIsAdding(true);
    try {
      const customId = `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const memberId = `${family.id}_${customId}`;
      const now = new Date().toISOString();
      const newMember: FamilyMember = {
        id: memberId,
        familyId: family.id,
        userId: customId,
        userEmail: `${customId}@member.local`,
        displayName: newName.trim(),
        phoneNumber: newPhone.trim() || undefined,
        role: newRelationship === "Bố" || newRelationship === "Mẹ" ? "parent" : "trusted_contact",
        relationship: newRelationship,
        permissions: { canViewAudio: true, canViewAiInsights: true, receiveAlerts: true },
        joinedAt: now,
      };
      await setDoc(doc(db, "familyMembers", memberId), removeUndefinedFields(newMember));
      setAddSuccessMsg(`Đã thêm ${newName.trim()} vào gia đình!`);
      setNewName("");
      setNewPhone("");
      setTimeout(() => setAddSuccessMsg(null), 2500);
      if (refreshProfile) refreshProfile();
    } catch (err) {
      console.error("Error adding member:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddFromContacts = async (contact: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    photoURL?: string;
    relationship?: string;
  }) => {
    if (!family?.id) return;
    try {
      const customId = `trusted_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const memberId = `${family.id}_${customId}`;
      const now = new Date().toISOString();
      const newMember: FamilyMember = {
        id: memberId,
        familyId: family.id,
        userId: customId,
        userEmail: contact.email || `${customId}@contact.local`,
        displayName: contact.displayName,
        phoneNumber: contact.phoneNumber || undefined,
        photoURL: contact.photoURL || undefined,
        role: "trusted_contact",
        relationship: contact.relationship || "Người thân",
        permissions: { canViewAudio: true, canViewAiInsights: true, receiveAlerts: true },
        joinedAt: now,
      };
      await setDoc(doc(db, "familyMembers", memberId), removeUndefinedFields(newMember));
      if (refreshProfile) refreshProfile();
    } catch (err) {
      console.error("Error adding contact member:", err);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string, memberName: string) => {
    if (!family?.id || memberUserId === user?.uid) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${memberName} khỏi nhóm gia đình?`)) return;
    try {
      await removeMemberFromFamily(family.id, memberUserId, memberId);
      if (refreshProfile) refreshProfile();
    } catch (err) {
      console.error("Error removing member:", err);
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

        {/* Add member action button */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 shadow-2xs shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm thành viên</span>
        </button>
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
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleCopyInviteCode}
                className="px-4 py-2.5 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-2xs"
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
          </div>
        )}

        {/* Member List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Danh sách thành viên ({members.length})
            </h4>
          </div>

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

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {member.phoneNumber && (
                      <a
                        href={`tel:${member.phoneNumber}`}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E8F8F0] text-slate-600 hover:text-[#159447] border border-slate-200/80 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title={`Gọi cho ${member.displayName}`}
                      >
                        <Phone className="w-4 h-4" />
                        <span className="hidden sm:inline">Gọi điện</span>
                      </a>
                    )}
                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id, member.userId, member.displayName || "thành viên")}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200/80 transition-colors cursor-pointer border-0"
                        title="Xóa thành viên"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: Add Member Options & Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6F0EB] w-full max-w-md rounded-3xl shadow-xl text-left flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E6F0EB] p-5 bg-[#F8FAF9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Thêm thành viên gia đình</h3>
                  <span className="text-xs text-slate-500 block">Thêm người thân vào nhóm để kết nối</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Option A: Quick Add Manual Form */}
              <form onSubmit={handleAddMemberManual} className="space-y-3 bg-[#F8FAF9] p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#159447]" />
                  <span>Thêm trực tiếp thành viên mới</span>
                </p>

                {addSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-[#159447] text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {addSuccessMsg}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tên hiển thị *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Mẹ Hằng, Bố Dũng, Chị Hai..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#159447] focus:ring-2 focus:ring-[#159447]/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Xưng hô trong nhà</label>
                    <select
                      value={newRelationship}
                      onChange={(e) => setNewRelationship(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#159447]"
                    >
                      <option value="Con cái">Con cái</option>
                      <option value="Bố">Bố</option>
                      <option value="Mẹ">Mẹ</option>
                      <option value="Ông nội / Ông ngoại">Ông</option>
                      <option value="Bà nội / Bà ngoại">Bà</option>
                      <option value="Anh/Chị">Anh / Chị</option>
                      <option value="Người thân">Người thân</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#159447]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdding || !newName.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-2xs disabled:opacity-50 mt-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAdding ? "Đang thêm..." : "Xác nhận thêm vào nhóm"}</span>
                </button>
              </form>

              {/* Option B: Choose from Google Contacts */}
              <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#159447] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Chọn từ Danh bạ Google</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 my-0">
                  Tự động đồng bộ tên, ảnh đại diện và số điện thoại từ danh bạ Google của bạn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowContactsPicker(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 text-[#159447] border border-[#159447]/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Mở Danh bạ Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Contacts Picker Modal */}
      {showContactsPicker && (
        <GoogleContactsPickerModal
          onSelectContact={handleAddFromContacts}
          onClose={() => setShowContactsPicker(false)}
        />
      )}
    </div>
  );
};
