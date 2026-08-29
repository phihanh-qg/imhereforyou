import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CheckInRecord,
  MoodRecord,
  VoiceMessageRecord,
  AlertRecord,
  ActiveMeeting,
  UserRole,
} from "../../types";
import {
  listenToRecentCheckIns,
  listenToRecentMoods,
  listenToActiveAlerts,
  recordCheckIn,
  recordMood,
  getTodayDateStr,
} from "../../services/checkInService";
import { listenToVoiceMessages } from "../../services/voiceService";
import {
  listenToFamilyMeeting,
  endFamilyMeeting,
  startFamilyMeeting,
  hasConfiguredMeetUrl,
  getFamilyFixedMeetUrl,
  ensureOrAutoCreateFamilyFixedMeetUrl,
} from "../../services/meetingService";
import { saveUserProfile } from "../../services/familyService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

import { FamilyMembersView } from "../common/FamilyMembersView";
import { NearbyPlacesModal } from "../common/NearbyPlacesModal";
import { CalendarDirectCreateModal } from "./CalendarDirectCreateModal";
import { FamilySettingsModal } from "./FamilySettingsModal";
import { AiAnalysisModal } from "./AiAnalysisModal";
import { EmergencyHelpModal } from "../parent/EmergencyHelpModal";
import { ActiveMeetingBanner } from "../common/ActiveMeetingBanner";
import { GoogleMeetSetupModal } from "../common/GoogleMeetSetupModal";

import {
  Heart,
  Video,
  Clock,
  Save,
  Phone,
  Building2,
  LogOut,
  ChevronLeft,
  Check,
  Sparkles,
  ShieldAlert,
  Home,
  Users,
  Settings,
  PlusCircle,
  UserPlus,
} from "lucide-react";

export const ChildDashboard: React.FC = () => {
  const { user, profile, family, members, refreshProfile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"home" | "family" | "settings">("home");

  // Check-in & state
  const [hasChildCheckedInToday, setHasChildCheckedInToday] = useState<boolean>(false);
  const [isCheckInLoading, setIsCheckInLoading] = useState<boolean>(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [meetingHidden, setMeetingHidden] = useState<boolean>(false);

  // Firestore records
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessageRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  // Modals
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarActionTitle, setCalendarActionTitle] = useState<string>("");
  const [showFamilySettings, setShowFamilySettings] = useState<boolean>(false);
  const [showNearbyModal, setShowNearbyModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMeetSetupModal, setShowMeetSetupModal] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // In-page settings form state
  const [settingsName, setSettingsName] = useState(profile?.displayName || "");
  const [settingsRole, setSettingsRole] = useState<UserRole>(profile?.role || "child");
  const [settingsRelationship, setSettingsRelationship] = useState(profile?.relationship || "Con cái");
  const [settingsEmergencyPhone, setSettingsEmergencyPhone] = useState(profile?.emergencyPhone || "");
  const [settingsStartHour, setSettingsStartHour] = useState(profile?.checkInWindow?.startHour ?? 7);
  const [settingsEndHour, setSettingsEndHour] = useState(profile?.checkInWindow?.endHour ?? 10);
  const [dailyReminderToggle, setDailyReminderToggle] = useState<boolean>(true);
  const [emergencyAlertToggle, setEmergencyAlertToggle] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettingsName(profile.displayName || "");
      setSettingsRole(profile.role || "child");
      setSettingsRelationship(profile.relationship || "Con cái");
      setSettingsEmergencyPhone(profile.emergencyPhone || "");
      setSettingsStartHour(profile.checkInWindow?.startHour ?? 7);
      setSettingsEndHour(profile.checkInWindow?.endHour ?? 10);
    }
  }, [profile]);

  const familyId = profile?.familyId || "";

  // Identify the parent (elderly) in this family
  const parentMember = members.find((m) => m.role === "parent");
  const parentName = parentMember?.displayName || "Mẹ";
  const parentRelationship = parentMember?.relationship || "Mẹ";

  // Real-time Listeners
  useEffect(() => {
    if (!familyId || !user) return;

    const todayStr = getTodayDateStr();

    const unsubCheckIns = listenToRecentCheckIns(familyId, (records) => {
      setCheckIns(records);
      const myRecord = records.find(
        (r) => (r.userId === user.uid || r.parentId === user.uid) && r.dateStr === todayStr
      );
      setHasChildCheckedInToday(!!myRecord);
    });

    const unsubMoods = listenToRecentMoods(familyId, (records) => {
      setMoods(records);
    });

    const unsubVoice = listenToVoiceMessages(familyId, (msgs) => {
      setVoiceMessages(msgs);
    });

    const unsubAlerts = listenToActiveAlerts(familyId, (alts) => {
      setAlerts(alts);
    });

    const unsubMeet = listenToFamilyMeeting(familyId, (meeting) => {
      setActiveMeeting(meeting);
    });

    return () => {
      unsubCheckIns();
      unsubMoods();
      unsubVoice();
      unsubAlerts();
      unsubMeet();
    };
  }, [familyId, user?.uid]);

  const todayStr = getTodayDateStr();

  // Filter Parent's check-ins
  const parentCheckIns = useMemo(() => {
    return checkIns.filter(
      (c) => c.userRole === "parent" || c.parentId === parentMember?.userId || (!c.userRole && c.parentId)
    );
  }, [checkIns, parentMember?.userId]);

  const todayParentCheckIn = parentCheckIns.find((c) => c.dateStr === todayStr) || null;
  const hasParentCheckedInToday = !!todayParentCheckIn;

  // Filter Child's own check-ins
  const myCheckIns = useMemo(() => {
    return checkIns.filter((c) => c.userId === user?.uid || c.parentId === user?.uid);
  }, [checkIns, user?.uid]);

  const latestMyCheckIn = myCheckIns[0] || null;

  // Formatted last check-in time
  const lastCheckInDisplay = useMemo(() => {
    if (!latestMyCheckIn) return "Chưa có";
    const d = new Date(latestMyCheckIn.timestamp);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }, [latestMyCheckIn]);

  // Formatted Vietnamese date string
  const todayFormattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Handle Child Check-in ("Báo bình an")
  const handleCheckIn = async () => {
    if (hasChildCheckedInToday) {
      showToast("Bạn đã check-in hôm nay");
      return;
    }
    if (!user || !familyId || isCheckInLoading) return;

    setIsCheckInLoading(true);
    try {
      await recordCheckIn(
        user.uid,
        profile?.displayName || "Con",
        familyId,
        "Tôi ổn, cả nhà yên tâm nhé!",
        "child",
        profile?.relationship || "Con cái"
      );
      setHasChildCheckedInToday(true);
      showToast("Đã gửi thông báo bình an");
    } catch (error) {
      console.error("Check-in error:", error);
      showToast("Lỗi khi gửi check-in");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleSaveInlineSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setIsSavingSettings(true);
    try {
      await saveUserProfile({
        uid: profile.uid,
        displayName: settingsName.trim() || profile.displayName,
        role: settingsRole,
        relationship: settingsRelationship.trim() || "Con cái",
        emergencyPhone: settingsEmergencyPhone.trim(),
        checkInWindow: { startHour: Number(settingsStartHour), endHour: Number(settingsEndHour) },
      });

      if (family?.id) {
        const memberId = `${family.id}_${profile.uid}`;
        await updateDoc(doc(db, "familyMembers", memberId), {
          displayName: settingsName.trim() || profile.displayName,
          role: settingsRole,
          relationship: settingsRelationship.trim(),
        }).catch(() => {});
      }

      showToast("Đã lưu cài đặt thành công");
      refreshProfile();
    } catch (err) {
      console.error("Save inline settings error:", err);
      showToast("Lỗi khi lưu cài đặt");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCallParent = () => {
    const phone = profile?.emergencyPhone || parentMember?.emergencyPhone || "0900000000";
    window.open(`tel:${phone}`, "_self");
  };

  const handleJoinMeeting = async () => {
    if (!familyId || !user) return;

    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      showToast("Đang vào Google Meet...");
      try {
        await startFamilyMeeting(
          familyId,
          user.uid,
          profile?.displayName || "Con",
          "child",
          family?.inviteCode,
          activeMeeting.meetUrl
        );
      } catch (err) {
        console.error("Error joining meeting:", err);
      }
      return;
    }

    let targetUrl = getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || "";
    if (!targetUrl) {
      try {
        targetUrl = await ensureOrAutoCreateFamilyFixedMeetUrl(familyId, family?.fixedMeetUrl);
      } catch (err) {
        console.warn("Auto create fixed meet url error:", err);
      }
    }

    if (!targetUrl) {
      setShowMeetSetupModal(true);
      return;
    }

    showToast("Đang vào Google Meet...");
    try {
      await startFamilyMeeting(
        familyId,
        user.uid,
        profile?.displayName || "Con",
        "child",
        family?.inviteCode,
        targetUrl
      );
    } catch (err) {
      console.error("Error joining meeting:", err);
    }
  };

  return (
    <div className="w-full flex-1 bg-white flex flex-col items-center">
      <div
        className={`w-full max-w-5xl flex flex-col flex-1 md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden ${
          activeTab === "family"
            ? "px-2 sm:px-4 py-2 h-[calc(100dvh-120px)] max-h-[calc(100dvh-120px)] overflow-hidden"
            : "px-3 sm:px-6 py-2 sm:py-5 pb-[84px] md:pb-4"
        }`}
      >
        {/* TAB 1: HOME PANEL - TỐI GIẢN & TẬP TRUNG (GIỐNG NGƯỜI LỚN TUỔI + NÚT PHÂN TÍCH) */}
        {activeTab === "home" && (
          <main className="flex-1 flex flex-col items-center justify-center py-2 md:py-4 w-full max-w-md mx-auto md:h-full">
            <div className="w-full text-center flex flex-col items-center justify-center space-y-3.5 md:space-y-4 lg:space-y-5 flex-1 max-h-[600px] lg:max-h-[640px]">
              
              {/* Header Info */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#f4f6f8] text-[#71767e] text-xs font-semibold">
                  <span>{todayFormattedDate}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#17191c] leading-tight m-0">
                  Hôm nay bạn vẫn ổn chứ?
                </h1>

                <p className="text-[#71767e] text-xs sm:text-sm leading-relaxed max-w-xs sm:max-w-sm mx-auto my-0">
                  Chạm nhẹ một lần để những người quan tâm biết bạn đang bình an.
                </p>
              </div>

              {/* Central Check-in Hero Button - Made responsive to screen height to prevent scrolling */}
              <div className="mx-auto w-[230px] h-[230px] md:w-[260px] md:h-[260px] lg:w-[310px] lg:h-[310px] grid place-items-center rounded-full bg-[#f6faf7] relative before:content-[''] before:absolute before:inset-[12px] md:before:inset-[14px] lg:before:inset-[16px] before:border before:border-[#dcefe3] before:rounded-full before:pointer-events-none transition-all duration-300">
                <button
                  id="childCheckBtn"
                  onClick={handleCheckIn}
                  disabled={isCheckInLoading}
                  className={`w-[185px] h-[185px] md:w-[210px] md:h-[210px] lg:w-[260px] lg:h-[260px] border-0 rounded-full text-white cursor-pointer select-none transition-all duration-300 z-10 flex flex-col items-center justify-center outline-none active:scale-[0.97] hover:-translate-y-1 ${
                    hasChildCheckedInToday
                      ? "bg-[#159447] animate-success shadow-[0_16px_40px_rgba(21,148,71,0.28)]"
                      : "bg-[#28b463] shadow-[0_16px_40px_rgba(40,180,99,0.24)] hover:shadow-[0_20px_48px_rgba(40,180,99,0.3)] animate-breathe"
                  }`}
                >
                  <svg
                    className={`w-8 h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 mx-auto mb-1 md:mb-1.5 lg:mb-2 ${
                      hasChildCheckedInToday ? "animate-draw" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="m5 12 4.2 4.2L19 6.8" />
                  </svg>
                  <span className="block text-[22px] md:text-[24px] lg:text-[28px] font-black my-1 leading-tight tracking-tight">
                    {hasChildCheckedInToday ? "Bạn đã bình an" : "Báo bình an"}
                  </span>
                </button>
              </div>

              {/* Status indicator */}
              <div className="text-xs sm:text-sm text-[#555b63] min-h-[26px] my-0">
                {hasChildCheckedInToday ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e8f8f0] text-[#159447] font-bold text-xs sm:text-sm shadow-3xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Thông báo đã được gửi đến gia đình</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[#8a8f96] font-medium text-xs sm:text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Hôm nay bạn chưa check-in</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Nút Phân Tích (AI) & Nút SOS */}
              <div className="w-full max-w-xs pt-1 space-y-2 md:space-y-2.5">
                {/* NÚT PHÂN TÍCH */}
                <button
                  type="button"
                  id="btnAnalysis"
                  onClick={() => setShowAiModal(true)}
                  className="w-full min-h-[46px] md:min-h-[48px] px-5 py-2.5 md:py-3 rounded-2xl bg-[#E8F8F0] hover:bg-[#DDF4E8] border border-[#C5ECD6] text-[#159447] font-bold text-sm transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-3xs group"
                >
                  <span className="text-left font-bold text-[#159447]">
                    Phân tích (AI)
                  </span>
                  <span className="text-[#159447] text-lg font-bold group-hover:translate-x-0.5 transition-transform">
                    ›
                  </span>
                </button>

                {/* Nút Cần trợ giúp khẩn cấp (SOS) */}
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="w-full min-h-[46px] md:min-h-[48px] px-5 py-2.5 md:py-3 rounded-2xl bg-[#fff5f6] hover:bg-[#ffebee] border border-[#fbd5db] text-[#d94b61] hover:text-[#c43c51] font-bold text-sm transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-3xs group"
                >
                  <span className="text-left font-bold text-[#b92c45]">
                    Cần trợ giúp khẩn cấp (SOS)
                  </span>
                  <span className="text-[#d94b61] text-lg font-bold group-hover:translate-x-0.5 transition-transform">
                    ›
                  </span>
                </button>
              </div>

            </div>
          </main>
        )}

        {/* TAB 2: NGƯỜI THÂN */}
        {activeTab === "family" && (
          <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden animate-in fade-in duration-150">
            <FamilyMembersView parentName={parentName} isParentView={false} />
          </div>
        )}

        {/* TAB 3: CÀI ĐẶT (SETTINGS) */}
        {activeTab === "settings" && (
          <section className="bg-white border border-[#eceef0] rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-left flex-1 animate-in fade-in duration-150 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setActiveTab("home")}
                className="border-0 bg-transparent text-xs sm:text-sm text-[#777] hover:text-[#17191c] cursor-pointer flex items-center gap-1 transition-colors p-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại trang chủ</span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#17191c] m-0 mb-6 tracking-tight">
              Cài đặt ứng dụng
            </h2>

            {/* Notification Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-[#eee]">
              {/* Daily Reminder Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#eceef0] bg-[#fafbfc]">
                <div>
                  <b className="block text-sm text-[#17191c]">Nhắc check-in hằng ngày</b>
                  <small className="block text-[#92969c] text-xs mt-1">
                    Gửi lời nhắc vào mỗi ngày
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDailyReminderToggle(!dailyReminderToggle);
                    showToast(
                      dailyReminderToggle
                        ? "Đã tắt nhắc hằng ngày"
                        : "Đã bật nhắc hằng ngày"
                    );
                  }}
                  className={`w-12 h-7 rounded-full border-0 relative cursor-pointer transition-colors ${
                    dailyReminderToggle ? "bg-[#28b463]" : "bg-[#d9dde1]"
                  }`}
                >
                  <span
                    className={`absolute w-5 h-5 rounded-full bg-white top-1 transition-all ${
                      dailyReminderToggle ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Emergency Notification Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#eceef0] bg-[#fafbfc]">
                <div>
                  <b className="block text-sm text-[#17191c]">Thông báo khẩn cấp</b>
                  <small className="block text-[#92969c] text-xs mt-1">
                    Cảnh báo khi người thân chưa check-in
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmergencyAlertToggle(!emergencyAlertToggle);
                    showToast(
                      emergencyAlertToggle
                        ? "Đã tắt cảnh báo"
                        : "Đã bật cảnh báo khẩn cấp"
                    );
                  }}
                  className={`w-12 h-7 rounded-full border-0 relative cursor-pointer transition-colors ${
                    emergencyAlertToggle ? "bg-[#28b463]" : "bg-[#d9dde1]"
                  }`}
                >
                  <span
                    className={`absolute w-5 h-5 rounded-full bg-white top-1 transition-all ${
                      emergencyAlertToggle ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Personal Details Form */}
            <form onSubmit={handleSaveInlineSettings} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#555b63] uppercase tracking-wide">
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eceef0] text-sm focus:outline-none focus:border-[#28b463]"
                    placeholder="VD: Con trai..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#555b63] uppercase tracking-wide">
                    Xưng hô trong nhà
                  </label>
                  <input
                    type="text"
                    value={settingsRelationship}
                    onChange={(e) => setSettingsRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eceef0] text-sm focus:outline-none focus:border-[#28b463]"
                    placeholder="VD: Con cái, Con gái út..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#555b63] uppercase tracking-wide flex items-center justify-between">
                  <span>Số điện thoại SOS</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={settingsEmergencyPhone}
                    onChange={(e) => setSettingsEmergencyPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#eceef0] text-sm focus:outline-none focus:border-[#28b463]"
                    placeholder="VD: 0912345678"
                  />
                  <Phone className="w-4 h-4 text-[#8a8f96] absolute left-3 top-3" />
                </div>
              </div>

              {/* Time window */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-[#555b63] uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#28b463]" />
                  <span>Khung giờ check-in mỗi ngày</span>
                </label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <span className="text-xs text-[#8a8f96] block mb-1">Từ lúc</span>
                    <select
                      value={settingsStartHour}
                      onChange={(e) => setSettingsStartHour(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#eceef0] text-sm bg-white focus:outline-none focus:border-[#28b463]"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-[#8a8f96] block mb-1">Đến lúc</span>
                    <select
                      value={settingsEndHour}
                      onChange={(e) => setSettingsEndHour(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#eceef0] text-sm bg-white focus:outline-none focus:border-[#28b463]"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3 rounded-xl bg-[#28b463] hover:bg-[#159447] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? "Đang lưu..." : "Lưu cài đặt"}</span>
              </button>
            </form>

            {/* Extra Management Actions: Family Members, Medical Places, Sign Out */}
            <div className="mt-8 pt-6 border-t border-[#eee] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowFamilySettings(true)}
                className="p-3.5 rounded-xl bg-[#f7f8fa] hover:bg-slate-100 border border-[#eceef0] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#17191c] block">
                      Thành viên & Mã mời
                    </span>
                    <span className="text-[11px] text-[#8a8f96]">Quản lý gia đình</span>
                  </div>
                </div>
                <span className="text-slate-400 text-sm">›</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNearbyModal(true)}
                className="p-3.5 rounded-xl bg-[#f7f8fa] hover:bg-slate-100 border border-[#eceef0] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#17191c] block">
                      Cơ sở y tế gần đây
                    </span>
                    <span className="text-[11px] text-[#8a8f96]">Tìm trạm xá, nhà thuốc</span>
                  </div>
                </div>
                <span className="text-slate-400 text-sm">›</span>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="p-3.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-100 flex items-center justify-between text-left transition-colors text-rose-700 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">Đăng xuất tài khoản</span>
                    <span className="text-[11px] text-rose-600/80">Thoát phiên đăng nhập</span>
                  </div>
                </div>
                <span className="text-rose-400 text-sm">›</span>
              </button>
            </div>
          </section>
        )}

        {/* BOTTOM NAVIGATION (Fixed & Always Visible matching Parent Layout) */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] px-4">
          <div className="w-full max-w-md mx-auto flex justify-around items-center">
            <button
              onClick={() => setActiveTab("home")}
              className={`border-0 bg-transparent text-xs cursor-pointer px-4 py-1.5 flex flex-col items-center gap-1 transition-colors ${
                activeTab === "home" ? "text-[#159447] font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Home className={`w-5 h-5 ${activeTab === "home" ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[11px] tracking-tight">Trang chủ</span>
            </button>

            <button
              onClick={() => setActiveTab("family")}
              className={`border-0 bg-transparent text-xs cursor-pointer px-4 py-1.5 flex flex-col items-center gap-1 transition-colors ${
                activeTab === "family" ? "text-[#159447] font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Users className={`w-5 h-5 ${activeTab === "family" ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[11px] tracking-tight">Người thân</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`border-0 bg-transparent text-xs cursor-pointer px-4 py-1.5 flex flex-col items-center gap-1 transition-colors ${
                activeTab === "settings" ? "text-[#159447] font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === "settings" ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[11px] tracking-tight">Cài đặt</span>
            </button>
          </div>
        </nav>

        {/* TOAST NOTIFICATION */}
        <div
          className={`fixed left-1/2 bottom-[82px] -translate-x-1/2 bg-[#222] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm pointer-events-none transition-all duration-250 z-50 whitespace-nowrap shadow-lg ${
            toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {toastMessage}
        </div>

        {/* AI Analysis Modal */}
        <AiAnalysisModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          members={members}
          familyId={familyId}
          currentUserId={user?.uid}
          checkIns={checkIns}
          moods={moods}
          voiceMessages={voiceMessages}
          onOpenCalendarSync={(title) => {
            setCalendarActionTitle(title || `Gọi hỏi thăm người thân`);
            setShowCalendarModal(true);
          }}
        />

        {/* Emergency Help Modal */}
        {showHelpModal && user && (
          <EmergencyHelpModal
            parentId={user.uid}
            parentName={profile?.displayName || "Con"}
            familyId={familyId}
            onClose={() => setShowHelpModal(false)}
            onOpenNearby={() => {
              setShowHelpModal(false);
              setShowNearbyModal(true);
            }}
          />
        )}

        {/* Nearby Medical Places Modal */}
        {showNearbyModal && (
          <NearbyPlacesModal
            parentName={parentName}
            onClose={() => setShowNearbyModal(false)}
          />
        )}

        {/* Calendar Sync Modal */}
        {showCalendarModal && (
          <CalendarDirectCreateModal
            defaultTitle={calendarActionTitle}
            onClose={() => setShowCalendarModal(false)}
          />
        )}

        {/* Family Management Modal */}
        {showFamilySettings && family && (
          <FamilySettingsModal
            family={family}
            members={members}
            onClose={() => setShowFamilySettings(false)}
            onRefresh={refreshProfile}
          />
        )}

        {/* Google Meet Setup Modal */}
        {showMeetSetupModal && (
          <GoogleMeetSetupModal
            familyId={familyId}
            currentMeetUrl={getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || ""}
            onClose={() => setShowMeetSetupModal(false)}
            onSavedAndJoin={async (savedUrl) => {
              setShowMeetSetupModal(false);
              if (familyId && user) {
                await startFamilyMeeting(
                  familyId,
                  user.uid,
                  profile?.displayName || "Con",
                  "child",
                  family?.inviteCode,
                  savedUrl
                );
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
