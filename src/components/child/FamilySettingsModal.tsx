import React, { useState } from "react";
import { Family, FamilyMember } from "../../types";
import { Users, Copy, Check, X, UserPlus, Video, ExternalLink, Edit2, Save } from "lucide-react";
import { GoogleContactsPickerModal } from "./GoogleContactsPickerModal";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { removeUndefinedFields } from "../../services/familyService";
import {
  getFamilyFixedMeetUrl,
  updateFamilyFixedMeetUrl,
  normalizeGoogleMeetUrl,
} from "../../services/meetingService";

interface FamilySettingsModalProps {
  family: Family;
  members: FamilyMember[];
  onClose: () => void;
  onRefresh: () => void;
}

export const FamilySettingsModal: React.FC<FamilySettingsModalProps> = ({
  family,
  members,
  onClose,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedMeet, setCopiedMeet] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showContactsPicker, setShowContactsPicker] = useState(false);

  // Fixed Google Meet URL state
  const initialMeetUrl = getFamilyFixedMeetUrl(family.id, family.inviteCode, family.fixedMeetUrl);
  const [meetUrl, setMeetUrl] = useState(initialMeetUrl);
  const [isEditingMeet, setIsEditingMeet] = useState(false);
  const [editMeetInput, setEditMeetInput] = useState(initialMeetUrl);
  const [isSavingMeet, setIsSavingMeet] = useState(false);

  const handleCopyCode = () => {
    const code = (family.inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
    navigator.clipboard.writeText(code || family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (code) {
      setDoc(doc(db, "familyInvitations", code), {
        familyId: family.id,
        inviteCode: code,
        name: family.name,
        createdAt: family.createdAt || new Date().toISOString(),
        createdBy: family.createdBy || "",
      }).catch(() => {});
    }
  };

  const handleCopyMeetUrl = () => {
    navigator.clipboard.writeText(meetUrl);
    setCopiedMeet(true);
    setTimeout(() => setCopiedMeet(false), 2000);
  };

  const handleSaveMeetUrl = async () => {
    setIsSavingMeet(true);
    try {
      const normalized = await updateFamilyFixedMeetUrl(family.id, editMeetInput);
      setMeetUrl(normalized);
      setEditMeetInput(normalized);
      setIsEditingMeet(false);
      onRefresh();
    } catch (err) {
      console.error("Save Meet URL error:", err);
    } finally {
      setIsSavingMeet(false);
    }
  };

  const handleAddFromContacts = async (contact: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    photoURL?: string;
    relationship?: string;
  }) => {
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
        photoURL: contact.photoURL,
        role: "trusted_contact",
        relationship: contact.relationship || "Người thân",
        permissions: { canViewAudio: true, canViewAiInsights: true, receiveAlerts: true },
        joinedAt: now,
      };
      await setDoc(doc(db, "familyMembers", memberId), removeUndefinedFields(newMember));
      onRefresh();
    } catch (err) {
      console.error("Error adding contact member:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6F0EB] w-full max-w-lg rounded-3xl shadow-xl text-left flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6F0EB] p-5 bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{family.name}</h3>
              <span className="text-xs text-slate-500 block">Thành viên & Cài đặt nhóm</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* Permanent Google Meet Card */}
          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#159447] uppercase tracking-wider">
                <Video className="w-4 h-4" />
                <span>Link Google Meet cố định của nhóm</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isEditingMeet) {
                    setIsEditingMeet(false);
                  } else {
                    setEditMeetInput(meetUrl);
                    setIsEditingMeet(true);
                  }
                }}
                className="text-xs font-bold text-[#159447] hover:text-[#12803c] cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditingMeet ? "Hủy" : "Đổi link"}</span>
              </button>
            </div>

            {isEditingMeet ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Chưa có link? Mở Google Meet để tạo link thật:</span>
                  <button
                    type="button"
                    onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
                    className="text-[11px] text-[#159447] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở meet.google.com/new</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editMeetInput}
                  onChange={(e) => setEditMeetInput(e.target.value)}
                  placeholder="Dán link https://meet.google.com/xxx-yyyy-zzz"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#159447]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingMeet(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-0"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeetUrl}
                    disabled={isSavingMeet}
                    className="px-3.5 py-1.5 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs border-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingMeet ? "Đang lưu..." : "Lưu link cố định"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-emerald-200/80">
                <span className="font-mono text-xs text-slate-800 truncate font-semibold">
                  {meetUrl || "Chưa cài đặt link Google Meet"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {meetUrl && (
                    <button
                      type="button"
                      onClick={handleCopyMeetUrl}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border-0"
                    >
                      {copiedMeet ? <Check className="w-3 h-3 text-[#159447]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedMeet ? "Đã chép" : "Chép link"}</span>
                    </button>
                  )}
                  {meetUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(meetUrl, "_blank", "noopener,noreferrer")}
                      className="py-1 px-2.5 rounded-lg bg-[#159447] hover:bg-[#12803c] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border-0 shadow-2xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở thử</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 my-0">
              Dùng 1 link Google Meet thật cố định cho toàn bộ gia đình để gọi video mà không bao giờ bị lỗi sai mã phòng.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách thành viên ({members.length})
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="px-3.5 py-2 rounded-xl bg-[#E8F8F0] text-[#159447] hover:bg-[#DCF5E8] text-sm font-bold transition-colors cursor-pointer"
              >
                Mã mời
              </button>
              <button
                type="button"
                onClick={() => setShowContactsPicker(true)}
                className="px-3.5 py-2 rounded-xl bg-[#159447] text-white hover:bg-[#12803c] text-sm font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Mời thêm</span>
              </button>
            </div>
          </div>

          {showInviteCode && (
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E6F0EB] flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="font-mono text-xl font-bold tracking-widest text-slate-800">
                {family.inviteCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Đã chép" : "Chép mã"}</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-white border border-[#E6F0EB] flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] text-[#159447] font-bold flex items-center justify-center text-base">
                      {m.displayName ? m.displayName.charAt(0) : "U"}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-800 text-base block">{m.displayName}</span>
                    <span className="text-xs text-slate-500">{m.userEmail}</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                      m.role === "parent"
                        ? "bg-[#E8F8F0] text-[#159447]"
                        : m.role === "trusted_contact"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {m.relationship || (m.role === "parent" ? "Bố/Mẹ" : m.role === "trusted_contact" ? "Người thân" : "Con")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showContactsPicker && (
        <GoogleContactsPickerModal
          onSelectContact={handleAddFromContacts}
          onClose={() => setShowContactsPicker(false)}
        />
      )}
    </div>
  );
};
