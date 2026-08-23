#!/bin/bash

# 1. Create UserSettingsModal.tsx
cat << 'INNER_EOF' > src/components/common/UserSettingsModal.tsx
import React, { useState } from "react";
import { UserProfile, UserRole, Family } from "../../types";
import { Settings, X, Save, Check, UserCircle, Clock } from "lucide-react";
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
  const [role, setRole] = useState<UserRole>(profile?.role || "child");
  const [relationship, setRelationship] = useState(profile?.relationship || "");
  const [emergencyPhone, setEmergencyPhone] = useState<string>(profile?.emergencyPhone ?? "");

  const [startHour, setStartHour] = useState<number>(profile?.checkInWindow?.startHour ?? 7);
  const [endHour, setEndHour] = useState<number>(profile?.checkInWindow?.endHour ?? 10);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      await saveUserProfile({
        uid: profile.uid,
        displayName,
        role,
        relationship,
        emergencyPhone: emergencyPhone.trim(),
        checkInWindow: { startHour, endHour }
      });
      
      if (family?.id) {
        const memberId = `${family.id}_${profile.uid}`;
        await updateDoc(doc(db, "familyMembers", memberId), {
          displayName,
          role,
          relationship
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
      <div className="bg-white border border-[#E5DACD] w-full max-w-lg rounded-3xl shadow-xl text-left flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F5F0E6] p-5 bg-[#FDFBF7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FDF6E3] text-[#D97757] flex items-center justify-center">
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
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-[#F5F0E6] pb-2">
                <UserCircle className="w-4 h-4 text-[#D97757]" />
                <span>Thông tin của bạn</span>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tên hiển thị</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Vai trò trong gia đình</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757] bg-white"
                >
                  <option value="parent">Bố / Mẹ</option>
                  <option value="child">Con cái</option>
                  <option value="trusted_contact">Người thân tin cậy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Xưng hô (VD: Mẹ ruột, Con trai cả)</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Mối quan hệ"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]"
                />
              </div>
            </div>

            {/* Khung giờ Check-in */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-[#F5F0E6] pb-2">
                <Clock className="w-4 h-4 text-[#D97757]" />
                <span>Khung giờ kỳ vọng check-in</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Từ (Giờ sáng):</label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]"
                  >
                    {[5, 6, 7, 8, 9, 10].map((h) => (
                      <option key={h} value={h}>
                        {h < 10 ? \`0\${h}:00\` : \`\${h}:00\`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Đến (Hết giờ):</label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                      <option key={h} value={h}>
                        {h < 10 ? \`0\${h}:00\` : \`\${h}:00\`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-bold flex items-center gap-2 border border-emerald-100">
                <Check className="w-4 h-4 text-emerald-600" />
                Lưu thông tin thành công!
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-2xl bg-[#D97757] hover:bg-[#C26243] text-white font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
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
INNER_EOF

# 2. Overwrite FamilySettingsModal.tsx
cat << 'INNER_EOF' > src/components/child/FamilySettingsModal.tsx
import React, { useState } from "react";
import { Family, FamilyMember } from "../../types";
import { Users, Copy, Check, X, UserPlus } from "lucide-react";
import { GoogleContactsPickerModal } from "./GoogleContactsPickerModal";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showContactsPicker, setShowContactsPicker] = useState(false);

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

  const handleAddFromContacts = async (contact: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    photoURL?: string;
    relationship?: string;
  }) => {
    try {
      const customId = \`trusted_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
      const memberId = \`\${family.id}_\${customId}\`;
      const now = new Date().toISOString();
      const newMember: FamilyMember = {
        id: memberId,
        familyId: family.id,
        userId: customId,
        userEmail: contact.email || \`\${customId}@contact.local\`,
        displayName: contact.displayName,
        photoURL: contact.photoURL,
        role: "trusted_contact",
        relationship: contact.relationship || "Người thân",
        permissions: { canViewAudio: true, canViewAiInsights: true, receiveAlerts: true },
        joinedAt: now,
      };
      await setDoc(doc(db, "familyMembers", memberId), newMember);
      onRefresh();
    } catch (err) {
      console.error("Error adding contact member:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5DACD] w-full max-w-lg rounded-3xl shadow-xl text-left flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F5F0E6] p-5 bg-[#FDFBF7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FDF6E3] text-[#D97757] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{family.name}</h3>
              <span className="text-xs text-slate-500 block">Thành viên gia đình</span>
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
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách ({members.length})
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="px-3 py-2 rounded-xl bg-[#FDF6E3] text-[#A64B29] hover:bg-[#F5E6CD] text-sm font-bold transition-colors"
              >
                Mã mời
              </button>
              <button
                type="button"
                onClick={() => setShowContactsPicker(true)}
                className="px-3 py-2 rounded-xl bg-[#D97757] text-white hover:bg-[#C26243] text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Mời thêm</span>
              </button>
            </div>
          </div>

          {showInviteCode && (
            <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E5DACD] flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="font-mono text-xl font-bold tracking-widest text-slate-800">
                {family.inviteCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center gap-1.5 transition-colors"
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
                className="p-4 rounded-2xl bg-white border border-[#E5DACD] flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#FDF6E3] text-[#D97757] font-bold flex items-center justify-center text-base">
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
                    className={\`text-xs font-bold px-2.5 py-1 rounded-lg \${
                      m.role === "parent"
                        ? "bg-emerald-50 text-emerald-700"
                        : m.role === "trusted_contact"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-[#FDF6E3] text-[#A64B29]"
                    }\`}
                  >
                    {m.role === "parent" ? "Bố/Mẹ" : m.role === "trusted_contact" ? "Tin cậy" : "Con"} 
                    {m.relationship ? \` (\${m.relationship})\` : ""}
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
INNER_EOF

# 3. Modify App.tsx
cat << 'INNER_EOF' > src/App.tsx
import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./components/landing/LandingPage";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { Header } from "./components/common/Header";
import { ParentDashboard } from "./components/parent/ParentDashboard";
import { ChildDashboard } from "./components/child/ChildDashboard";
import { FamilySettingsModal } from "./components/child/FamilySettingsModal";
import { UserSettingsModal } from "./components/common/UserSettingsModal";
import { Heart } from "lucide-react";

function MainApp() {
  const { user, profile, family, members, loading, refreshProfile } = useAuth();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showUserSettings, setShowUserSettings] = useState<boolean>(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-4">
        <div className="animate-pulse mb-3 flex flex-col items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-xl shadow-sm bg-white p-1" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">CON CÓ Ở ĐÂY</h2>
        <p className="text-xs text-slate-500 mt-0.5">Đang kết nối tài khoản an toàn...</p>
      </div>
    );
  }

  // Not authenticated -> Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated but no profile or no family attached -> Onboarding Flow
  if (!profile || !profile.familyId || !family) {
    return <OnboardingFlow />;
  }

  // Authenticated with profile & family
  const isParent = profile.role === "parent";

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-slate-900 flex flex-col">
      <Header 
        onOpenFamilySettings={() => setShowSettings(true)} 
        onOpenUserSettings={() => setShowUserSettings(true)}
      />
      <main className="flex-1">
        {isParent ? <ParentDashboard /> : <ChildDashboard />}
      </main>

      {/* Global Modals */}
      {showSettings && (
        <FamilySettingsModal
          family={family}
          members={members}
          onClose={() => setShowSettings(false)}
          onRefresh={refreshProfile}
        />
      )}

      {showUserSettings && (
        <UserSettingsModal
          profile={profile}
          family={family}
          onClose={() => setShowUserSettings(false)}
          onRefresh={refreshProfile}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
INNER_EOF

# 4. Modify Header.tsx
cat << 'INNER_EOF' > src/components/common/Header.tsx
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Bell, Users, Copy, Check, UserMinus, MoreVertical, Settings } from "lucide-react";
import { requestNotificationPermission } from "../../services/notificationService";
import { LeaveFamilyModal } from "./LeaveFamilyModal";

interface HeaderProps {
  onOpenFamilySettings?: () => void;
  onOpenUserSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFamilySettings, onOpenUserSettings }) => {
  const { user, profile, family, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowMenu(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
  };

  const isParent = profile?.role === "parent";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#F5F0E6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain rounded-lg shadow-sm" />
          <span className="font-bold text-slate-800 tracking-tight text-base sm:text-lg">
            CON CÓ Ở ĐÂY
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Button */}
          {!notifGranted && (
            <button
              onClick={handleEnableNotifications}
              className="p-1.5 rounded-lg text-[#D97757] hover:bg-[#FDF6E3] transition-colors"
              title="Bật thông báo"
            >
              <Bell className="w-5 h-5 animate-pulse" />
            </button>
          )}
          
          {/* Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                {profile && (
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="block text-xs font-bold text-slate-900 truncate">
                      {profile.displayName || user?.email}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {isParent ? "Vai trò: Bố/Mẹ" : profile.role === "trusted_contact" ? "Vai trò: Người thân" : "Vai trò: Con cái"}
                    </span>
                  </div>
                )}
                {family?.inviteCode && (
                  <button
                    onClick={handleCopyCode}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#FDF6E3] flex items-center gap-2 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#D97757]" />}
                    <span>{copied ? "Đã chép mã" : \`Mã: \${family.inviteCode}\`}</span>
                  </button>
                )}
                {onOpenFamilySettings && (
                  <button
                    onClick={() => {
                      onOpenFamilySettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#FDF6E3] flex items-center gap-2 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-[#D97757]" />
                    <span>Xem thành viên</span>
                  </button>
                )}
                {onOpenUserSettings && (
                  <button
                    onClick={() => {
                      onOpenUserSettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#FDF6E3] flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#D97757]" />
                    <span>Cài đặt cá nhân</span>
                  </button>
                )}
                {family && (
                  <button
                    onClick={() => {
                      setShowLeaveModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                    <span>Rời nhóm</span>
                  </button>
                )}
                
                <div className="h-px bg-slate-100 my-1"></div>
                
                <button
                  onClick={() => {
                    signOut();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showLeaveModal && (
        <LeaveFamilyModal
          familyName={family?.name}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </header>
  );
};
INNER_EOF

# Remove profile prop passing to FamilySettingsModal inside ChildDashboard if any
sed -i '/profile={profile!}/d' src/components/child/ChildDashboard.tsx

