import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { MoodType, CheckInRecord, MoodRecord, VoiceMessageRecord, UserRole, AlertRecord } from "../../types";
import {
  recordCheckIn,
  recordMood,
  listenToRecentCheckIns,
  listenToRecentMoods,
  listenToActiveAlerts,
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
import { ActiveMeeting } from "../../types";
import { saveUserProfile } from "../../services/familyService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { EmergencyHelpModal } from "./EmergencyHelpModal";
import { NearbyPlacesModal } from "../common/NearbyPlacesModal";
import { FamilyMembersView } from "../common/FamilyMembersView";
import { ActiveMeetingBanner } from "../common/ActiveMeetingBanner";
import { GoogleMeetSetupModal } from "../common/GoogleMeetSetupModal";
import { NotificationBanner } from "../common/NotificationBanner";
import {
  Heart,
  Video,
  Mail,
  Clock,
  Save,
  Phone,
  Building2,
  LogOut,
  ChevronLeft,
  Check,
  Sparkles,
  ShieldAlert,
  MessageCircle,
  Home,
  Users,
  Settings,
} from "lucide-react";

export const ParentDashboard: React.FC = () => {
  const { user, profile, family, refreshProfile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"home" | "family" | "settings">("home");

  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isCheckInLoading, setIsCheckInLoading] = useState<boolean>(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [meetingHidden, setMeetingHidden] = useState<boolean>(false);
  const [showMeetSetupModal, setShowMeetSetupModal] = useState<boolean>(false);

  // Toast state
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
  const [settingsRole, setSettingsRole] = useState<UserRole>(profile?.role || "parent");
  const [settingsRelationship, setSettingsRelationship] = useState(profile?.relationship || "Mẹ");
  const [settingsEmergencyPhone, setSettingsEmergencyPhone] = useState(profile?.emergencyPhone || "");
  const [settingsStartHour, setSettingsStartHour] = useState(profile?.checkInWindow?.startHour ?? 7);
  const [settingsEndHour, setSettingsEndHour] = useState(profile?.checkInWindow?.endHour ?? 10);
  const [dailyReminderToggle, setDailyReminderToggle] = useState<boolean>(true);
  const [emergencyAlertToggle, setEmergencyAlertToggle] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettingsName(profile.displayName || "");
      setSettingsRole(profile.role || "parent");
      setSettingsRelationship(profile.relationship || "Mẹ");
      setSettingsEmergencyPhone(profile.emergencyPhone || "");
      setSettingsStartHour(profile.checkInWindow?.startHour ?? 7);
      setSettingsEndHour(profile.checkInWindow?.endHour ?? 10);
    }
  }, [profile]);

  const handleSaveInlineSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setIsSavingSettings(true);
    try {
      const rel = settingsRelationship.trim();
      const elderTitle = rel.includes("Bố") || rel.includes("Ba") || rel.includes("Cha") ? "Bố" : rel.includes("Ông") ? "Ông" : rel.includes("Bà") ? "Bà" : "Mẹ";
      await saveUserProfile({
        uid: profile.uid,
        displayName: settingsName.trim() || profile.displayName,
        role: settingsRole,
        elderlyTitle: elderTitle,
        relationship: rel || elderTitle,
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

      setSettingsSavedSuccess(true);
      showToast("Đã lưu cài đặt thành công");
      setTimeout(() => setSettingsSavedSuccess(false), 2500);
      refreshProfile();
    } catch (err) {
      console.error("Save inline settings error:", err);
      showToast("Lỗi khi lưu cài đặt");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // All recent check-ins & active alerts
  const [allCheckIns, setAllCheckIns] = useState<CheckInRecord[]>([]);
  const [, setAllMoods] = useState<MoodRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  // Modals
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState<boolean>(false);

  const parentName = profile?.displayName || "Mẹ";
  const parentTitle = profile?.elderlyTitle || "Mẹ";
  const familyId = profile?.familyId || "";

  // Listen to check-ins & moods for today
  useEffect(() => {
    if (!familyId || !user) return;

    const todayStr = getTodayDateStr();

    const unsubCheckIns = listenToRecentCheckIns(familyId, (records) => {
      setAllCheckIns(records);
      const myRecord = records.find(
        (r) => (r.userId === user.uid || r.parentId === user.uid) && r.dateStr === todayStr
      );
      if (myRecord) {
        setHasCheckedInToday(true);
      } else {
        setHasCheckedInToday(false);
      }
    });

    const unsubMoods = listenToRecentMoods(familyId, (records) => {
      setAllMoods(records);
      const myMood = records.find(
        (r) => (r.userId === user.uid || r.parentId === user.uid) && r.dateStr === todayStr
      );
      if (myMood) {
        setSelectedMood(myMood.mood);
      }
    });

    const unsubAlerts = listenToActiveAlerts(familyId, (alts) => setAlerts(alts));

    const unsubMeet = listenToFamilyMeeting(familyId, (meeting) => {
      setActiveMeeting(meeting);
      if (meeting?.isOpen) {
        setMeetingHidden(false);
      }
    });

    return () => {
      unsubCheckIns();
      unsubMoods();
      unsubAlerts();
      unsubMeet();
    };
  }, [familyId, user?.uid, parentTitle]);

  // Handle Check-in ("Báo bình an")
  const handleCheckIn = async () => {
    if (hasCheckedInToday) {
      showToast("Bạn đã check-in hôm nay");
      return;
    }
    if (!user || !familyId || isCheckInLoading) return;

    setIsCheckInLoading(true);
    try {
      await recordCheckIn(
        user.uid,
        parentName,
        familyId,
        "Tôi ổn, con yên tâm nhé!",
        "parent",
        parentTitle
      );
      setHasCheckedInToday(true);
      showToast("Đã gửi thông báo bình an");
    } catch (error) {
      console.error("Check-in error:", error);
      showToast("Lỗi khi gửi check-in");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  // Handle Mood selection
  const handleSelectMood = async (mood: MoodType, label: string) => {
    if (!user || !familyId) return;

    setSelectedMood(mood);
    try {
      await recordMood(
        user.uid,
        familyId,
        mood,
        label,
        parentName,
        "parent"
      );
      showToast(`Đã cập nhật tâm trạng: ${label}`);
    } catch (error) {
      console.error("Mood record error:", error);
    }
  };

  const moodsList: { type: MoodType; label: string }[] = [
    { type: "happy", label: "Vui vẻ" },
    { type: "normal", label: "Bình an" },
    { type: "tired", label: "Hơi mệt" },
    { type: "sad", label: "Nhớ con" },
  ];

  // Filter parent's records
  const myCheckIns = useMemo(() => {
    return allCheckIns.filter(
      (c) => c.userId === user?.uid || c.parentId === user?.uid || c.userRole === "parent"
    );
  }, [allCheckIns, user?.uid]);

  const latestCheckIn = myCheckIns[0] || null;

  // Streak count
  const checkInCount = useMemo(() => {
    return myCheckIns.length > 0 ? myCheckIns.length : 1;
  }, [myCheckIns]);

  // Formatted last check-in time (e.g. "13:50")
  const lastCheckInDisplay = useMemo(() => {
    if (!latestCheckIn) return "Chưa có";
    const d = new Date(latestCheckIn.timestamp);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }, [latestCheckIn]);

  // Formatted Vietnamese date string (e.g. "Thứ Bảy, 22 tháng 8, 2026")
  const todayFormattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleJoinMeeting = async () => {
    if (!familyId || !user) return;

    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      showToast("Đang vào Google Meet...");
      try {
        await startFamilyMeeting(
          familyId,
          user.uid,
          profile?.displayName || "Bố Mẹ",
          "parent",
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
        profile?.displayName || "Bố Mẹ",
        "parent",
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
        className={`w-full max-w-5xl flex flex-col flex-1 ${
          activeTab === "family"
            ? "px-2 sm:px-4 py-2 h-[calc(100dvh-120px)] max-h-[calc(100dvh-120px)] overflow-hidden"
            : "px-3 sm:px-6 py-2 sm:py-5 pb-[84px]"
        }`}
      >
        {/* Active Emergency SOS Alerts Banner */}
        <NotificationBanner alerts={alerts} onCallParent={handleJoinMeeting} />

        {/* TAB 1: HOME PANEL - TỐI GIẢN & TẬP TRUNG (NỀN TRẮNG KHÔNG KHUNG BAO BỌC) */}
        {activeTab === "home" && (
          <main className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8">
            <div className="w-full max-w-lg text-center flex flex-col items-center">
              {/* Header Info */}
              <div className="max-w-md mx-auto mb-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#f4f6f8] text-[#71767e] text-xs font-semibold mb-2.5">
                  <span>{todayFormattedDate}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#17191c] m-0 mb-2">
                  Hôm nay bạn vẫn ổn chứ?
                </h1>

                <p className="text-[#71767e] text-xs sm:text-sm leading-relaxed max-w-sm mx-auto my-0">
                  Chạm nhẹ một lần để những người quan tâm biết bạn đang <br />
                  bình an.
                </p>
              </div>

              {/* Central Check-in Hero Button */}
              <div className="my-6 sm:my-8 mx-auto w-[230px] h-[230px] sm:w-[270px] sm:h-[270px] grid place-items-center rounded-full bg-[#f6faf7] relative before:content-[''] before:absolute before:inset-[12px] sm:before:inset-[14px] before:border before:border-[#dcefe3] before:rounded-full before:pointer-events-none">
                <button
                  id="checkBtn"
                  onClick={handleCheckIn}
                  disabled={isCheckInLoading}
                  className={`w-[185px] h-[185px] sm:w-[220px] sm:h-[220px] border-0 rounded-full text-white cursor-pointer select-none transition-all duration-200 z-10 flex flex-col items-center justify-center outline-none active:scale-[0.97] hover:-translate-y-1 ${
                    hasCheckedInToday
                      ? "bg-[#159447] animate-success shadow-[0_16px_40px_rgba(21,148,71,0.28)]"
                      : "bg-[#28b463] shadow-[0_16px_40px_rgba(40,180,99,0.24)] hover:shadow-[0_20px_48px_rgba(40,180,99,0.3)] animate-breathe"
                  }`}
                >
                  <svg
                    className={`w-7 h-7 sm:w-9 sm:h-9 mx-auto mb-1 ${hasCheckedInToday ? "animate-draw" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="m5 12 4.2 4.2L19 6.8" />
                  </svg>
                  <span className="block text-[22px] sm:text-[26px] font-black my-1 leading-tight tracking-tight">
                    {hasCheckedInToday ? "Bạn đã bình an" : "Báo bình an"}
                  </span>
                </button>
              </div>

              {/* Status indicator */}
              <div className="text-xs sm:text-sm text-[#555b63] min-h-[26px] mb-6">
                {hasCheckedInToday ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e8f8f0] text-[#159447] font-bold text-xs sm:text-sm">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Thông báo đã được gửi đến gia đình</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[#8a8f96] font-medium text-xs sm:text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Hôm nay bạn chưa check-in</span>
                  </div>
                )}
              </div>

              {/* Single Dedicated SOS Button */}
              <div className="w-full max-w-sm pt-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#fff5f6] hover:bg-[#ffebee] border border-[#fbd5db] text-[#d94b61] hover:text-[#c43c51] font-bold text-sm sm:text-[15px] transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-2xs group"
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
            <FamilyMembersView parentName={parentName} isParentView={true} />
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
                    showToast(dailyReminderToggle ? "Đã tắt nhắc hằng ngày" : "Đã bật nhắc hằng ngày");
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
                    Cảnh báo khi bạn lâu chưa check-in
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmergencyAlertToggle(!emergencyAlertToggle);
                    showToast(emergencyAlertToggle ? "Đã tắt cảnh báo" : "Đã bật cảnh báo khẩn cấp");
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
                    placeholder="VD: Mẹ Lan..."
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
                    placeholder="VD: Mẹ, Bố..."
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

            {/* Medical Places & Signout actions */}
            <div className="mt-8 pt-6 border-t border-[#eee] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowNearbyPlaces(true)}
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

        {/* BOTTOM NAVIGATION (Fixed & Always Visible) */}
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

        {/* Emergency Help Modal */}
        {showHelpModal && user && (
          <EmergencyHelpModal
            parentId={user.uid}
            parentName={parentName}
            familyId={familyId}
            onClose={() => setShowHelpModal(false)}
            onOpenNearby={() => {
              setShowHelpModal(false);
              setShowNearbyPlaces(true);
            }}
          />
        )}

        {/* Nearby Medical Places Modal */}
        {showNearbyPlaces && (
          <NearbyPlacesModal
            parentName={parentName}
            onClose={() => setShowNearbyPlaces(false)}
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
                  profile?.displayName || "Bố Mẹ",
                  "parent",
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
