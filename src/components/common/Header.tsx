import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Bell, Users, Copy, Check, UserMinus, Settings, User, Heart, Video } from "lucide-react";
import { requestNotificationPermission } from "../../services/notificationService";
import { listenToFamilyMeeting, startFamilyMeeting } from "../../services/meetingService";
import { ActiveMeeting } from "../../types";
import { LeaveFamilyModal } from "./LeaveFamilyModal";

interface HeaderProps {
  onOpenFamilySettings?: () => void;
  onOpenUserSettings?: () => void;
  onOpenMeetSetup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFamilySettings,
  onOpenUserSettings,
  onOpenMeetSetup,
}) => {
  const { user, profile, family, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );

  useEffect(() => {
    if (!family?.id) return;
    const unsub = listenToFamilyMeeting(family.id, (meet) => {
      setActiveMeeting(meet);
    });
    return () => unsub();
  }, [family?.id]);

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

  const handleJoinActiveMeeting = async () => {
    if (!family?.id) return;
    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      window.open(activeMeeting.meetUrl, "_blank", "noopener,noreferrer");
    } else {
      await startFamilyMeeting(
        family.id,
        user?.uid || "",
        profile?.displayName || "Thành viên",
        profile?.role || "child",
        family.inviteCode
      );
    }
  };

  const isParent = profile?.role === "parent";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo with clean typography */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#17191c] tracking-[-0.3px] text-base sm:text-[17px]">
            Con có ở đây
          </span>
        </div>

        {/* Right Actions: Notification Bell + Avatar with Green Active Dot */}
        <div className="flex items-center gap-2">
          {/* Notification Permission Bell */}
          {!notifGranted && (
            <button
              onClick={handleEnableNotifications}
              className="p-1.5 rounded-full text-[#2EBD6E] hover:bg-[#E8F8F0] transition-colors"
              title="Bật thông báo"
            >
              <Bell className="w-4.5 h-4.5 animate-pulse" />
            </button>
          )}
          
          {/* User Profile Avatar with Green Status Dot (Exact match from screenshot) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-slate-50 border border-[#E6F0EB] text-slate-700 flex items-center justify-center transition-all shadow-2xs relative"
              aria-label="Cài đặt & Tài khoản"
              title="Tài khoản & Gia đình"
            >
              <User className="w-4.5 h-4.5 text-slate-700" />
              {/* Green online/status dot on the top-right corner */}
              <span className="w-2 h-2 rounded-full bg-[#2EBD6E] ring-2 ring-white absolute top-0 right-0" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E6F0EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {profile && (
                  <div className="px-4 py-2.5 border-b border-slate-100 mb-1 bg-[#F8FAF9]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2EBD6E]" />
                      <span className="block text-xs font-bold text-slate-900 truncate">
                        {profile.displayName || user?.email}
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-500 truncate mt-0.5 pl-4">
                      {isParent
                        ? `Vai trò: ${profile.elderlyTitle || profile.relationship || "Bố/Mẹ"}`
                        : profile.role === "trusted_contact"
                        ? `Vai trò: ${profile.relationship || "Người thân"}`
                        : `Vai trò: ${profile.relationship || "Con cái"}`}
                    </span>
                  </div>
                )}

                {family?.inviteCode && (
                  <button
                    onClick={handleCopyCode}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-[#E8F8F0] hover:text-[#2EBD6E] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#2EBD6E]" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? "Đã sao chép mã" : `Mã gia đình: ${family.inviteCode}`}</span>
                  </button>
                )}

                {onOpenFamilySettings && (
                  <button
                    onClick={() => {
                      onOpenFamilySettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-[#E8F8F0] hover:text-[#2EBD6E] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Thành viên gia đình</span>
                  </button>
                )}

                {onOpenMeetSetup && (
                  <button
                    onClick={() => {
                      onOpenMeetSetup();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-[#E8F8F0] hover:text-[#2EBD6E] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Video className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt cuộc gọi</span>
                  </button>
                )}

                {onOpenUserSettings && (
                  <button
                    onClick={() => {
                      onOpenUserSettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-[#E8F8F0] hover:text-[#2EBD6E] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt cá nhân & SOS</span>
                  </button>
                )}

                {family && (
                  <button
                    onClick={() => {
                      setShowLeaveModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <UserMinus className="w-4 h-4 text-rose-500" />
                    <span>Rời nhóm gia đình</span>
                  </button>
                )}
                
                <div className="h-px bg-slate-100 my-1"></div>
                
                <button
                  onClick={() => {
                    signOut();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
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
