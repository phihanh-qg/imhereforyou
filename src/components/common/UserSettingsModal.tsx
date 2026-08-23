import React, { useState } from "react";
import { UserProfile, UserRole, Family } from "../../types";
import { Settings, X, Save, Check, UserCircle, Clock, PlusCircle } from "lucide-react";
import { saveUserProfile } from "../../services/familyService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface UserSettingsModalProps {
  profile: UserProfile | null;
  family: Family | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ profile, family, onClose, onRefresh }) => {
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  
  // Determine initial role & isElderly state
  const isInitiallyParent = profile?.role === "parent";
  const [isElderly, setIsElderly] = useState<boolean>(isInitiallyParent);
  
  const [role, setRole] = useState<string>(() => {
    if (profile?.role === "parent") {
      const rel = (profile?.relationship || profile?.elderlyTitle || "").toLowerCase();
      if (rel.includes("bố") || rel.includes("ba") || rel.includes("cha")) return "parent_dad";
      if (rel.includes("ông")) return "parent_grandpa";
      if (rel.includes("bà")) return "parent_grandma";
      if (rel.includes("mẹ") || rel.includes("má")) return "parent_mom";
      return "custom";
    }
    if (profile?.role === "trusted_contact") return "trusted_contact";
    if (profile?.role === "child") {
      const rel = (profile?.relationship || "").toLowerCase();
      if (rel && rel !== "con cái" && rel !== "con" && rel !== "con trai" && rel !== "con gái") {
        return "custom";
      }
      return "child";
    }
    return "child";
  });

  const [customRoleTitle, setCustomRoleTitle] = useState<string>(() => {
    if (role === "custom" || (!["parent_mom", "parent_dad", "parent_grandpa", "parent_grandma", "child", "trusted_contact"].includes(role))) {
      return profile?.relationship || profile?.elderlyTitle || "";
    }
    return "";
  });

  const [relationship, setRelationship] = useState<string>(profile?.relationship || "");
  const [emergencyPhone, setEmergencyPhone] = useState<string>(profile?.emergencyPhone ?? "");

  const [startHour, setStartHour] = useState<number>(profile?.checkInWindow?.startHour ?? 7);
  const [endHour, setEndHour] = useState<number>(profile?.checkInWindow?.endHour ?? 10);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleRoleChange = (newRoleVal: string) => {
    setRole(newRoleVal);
    if (newRoleVal === "parent_mom") {
      setIsElderly(true);
      setRelationship("Mẹ");
    } else if (newRoleVal === "parent_dad") {
      setIsElderly(true);
      setRelationship("Bố");
    } else if (newRoleVal === "parent_grandpa") {
      setIsElderly(true);
      setRelationship("Ông");
    } else if (newRoleVal === "parent_grandma") {
      setIsElderly(true);
      setRelationship("Bà");
    } else if (newRoleVal === "child") {
      setIsElderly(false);
      setRelationship("Con cái");
    } else if (newRoleVal === "trusted_contact") {
      setIsElderly(false);
      setRelationship("Người thân");
    } else if (newRoleVal === "custom") {
      if (customRoleTitle) {
        setRelationship(customRoleTitle);
      }
    }
  };

  const handleCustomTitleChange = (val: string) => {
    setCustomRoleTitle(val);
    setRelationship(val);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      let finalRole: UserRole = isElderly ? "parent" : role === "trusted_contact" ? "trusted_contact" : "child";
      
      let titleLabel = "";
      if (role === "parent_mom") titleLabel = "Mẹ";
      else if (role === "parent_dad") titleLabel = "Bố";
      else if (role === "parent_grandpa") titleLabel = "Ông";
      else if (role === "parent_grandma") titleLabel = "Bà";
      else if (role === "custom") titleLabel = customRoleTitle.trim() || relationship.trim() || (isElderly ? "Người thân" : "Thành viên");
      else if (role === "trusted_contact") titleLabel = "Người thân";
      else titleLabel = "Con cái";

      const cleanRelationship = relationship.trim() || titleLabel;
      const profileData: any = {
        uid: profile.uid,
        displayName: displayName.trim() || profile.displayName,
        role: finalRole,
        relationship: cleanRelationship,
        emergencyPhone: emergencyPhone.trim(),
        checkInWindow: { startHour, endHour }
      };

      if (isElderly) {
        profileData.elderlyTitle = titleLabel || cleanRelationship || "Bố/Mẹ";
      }

      await saveUserProfile(profileData);
      
      if (family?.id) {
        const memberId = `${family.id}_${profile.uid}`;
        await updateDoc(doc(db, "familyMembers", memberId), {
          displayName: displayName.trim() || profile.displayName,
          role: finalRole,
          relationship: cleanRelationship
        }).catch(() => {});
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onRefresh();
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6F0EB] w-full max-w-lg rounded-3xl shadow-xl text-left flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6F0EB] p-5 bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Cài đặt cá nhân</h3>
              <span className="text-xs text-slate-500 block">Thông tin & Khung giờ</span>
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
        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Thông tin cá nhân */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-[#E6F0EB] pb-2">
                <UserCircle className="w-4 h-4 text-[#2EBD6E]" />
                <span>Thông tin của bạn</span>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tên hiển thị</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Vai trò trong gia đình</label>
                  {role !== "custom" && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange("custom")}
                      className="text-xs font-semibold text-[#159447] hover:underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Thêm vai trò tùy chọn</span>
                    </button>
                  )}
                </div>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E] bg-white"
                >
                  <option value="parent_mom">Mẹ</option>
                  <option value="parent_dad">Bố</option>
                  <option value="parent_grandpa">Ông</option>
                  <option value="parent_grandma">Bà</option>
                  <option value="child">Con cái</option>
                  <option value="trusted_contact">Người thân tin cậy</option>
                  <option value="custom">Tùy chọn khác / Vai trò tùy chỉnh...</option>
                </select>
              </div>

              {/* Custom Role Input */}
              {role === "custom" && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhập vai trò tùy chỉnh (VD: Bác Hai, Cô Út, Dì Bảy, Chú Sáu...):
                  </label>
                  <input
                    type="text"
                    value={customRoleTitle}
                    onChange={(e) => handleCustomTitleChange(e.target.value)}
                    placeholder="VD: Bác Hai, Cô Út, Dì..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E] bg-white"
                    required
                  />
                </div>
              )}

              {/* Checkbox: Người lớn tuổi (internal config with checkbox) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  id="elderlyCheckbox"
                  checked={isElderly}
                  onChange={(e) => setIsElderly(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#2EBD6E] focus:ring-[#2EBD6E] border-slate-300 cursor-pointer accent-[#2EBD6E]"
                />
                <label htmlFor="elderlyCheckbox" className="text-xs text-slate-700 cursor-pointer select-none">
                  <span className="font-bold text-slate-900 block">
                    Người lớn tuổi
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Đánh dấu để bật giao diện nút lớn, hỗ trợ điểm danh "Tôi vẫn ổn" và nút gọi khẩn cấp SOS.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Xưng hô hiển thị (VD: Mẹ ruột, Con trai cả, Bác Hai)</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Mối quan hệ"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Số điện thoại khẩn cấp
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                />
              </div>
            </div>

            {/* Khung giờ Check-in (chỉ cần thiết hoặc hiển thị rõ cho người dùng) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-[#E6F0EB] pb-2">
                <Clock className="w-4 h-4 text-[#2EBD6E]" />
                <span>Khung giờ kỳ vọng check-in</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Từ (Giờ sáng):</label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                  >
                    {[5, 6, 7, 8, 9, 10].map((h) => (
                      <option key={h} value={h}>
                        {h < 10 ? `0${h}:00` : `${h}:00`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Đến (Hết giờ):</label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                      <option key={h} value={h}>
                        {h < 10 ? `0${h}:00` : `${h}:00`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-[#E8F8F0] text-emerald-900 text-sm font-bold flex items-center gap-2 border border-[#DCF5E8]">
                <Check className="w-4 h-4 text-[#2EBD6E]" />
                Lưu thông tin thành công!
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Save className="w-5 h-5" />
                {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

