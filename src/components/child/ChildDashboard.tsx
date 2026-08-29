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
  const [settingsRelationship, setSettingsRelationship] = useState(profile?.relationship || "Con c├íi");
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
      setSettingsRelationship(profile.relationship || "Con c├íi");
      setSettingsEmergencyPhone(profile.emergencyPhone || "");
      setSettingsStartHour(profile.checkInWindow?.startHour ?? 7);
      setSettingsEndHour(profile.checkInWindow?.endHour ?? 10);
    }
  }, [profile]);

  const familyId = profile?.familyId || "";

  const parentMember = members.find((m) => m.role === "parent");
  const parentName = parentMember?.displayName || "Mß║╣";

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
    const unsubMoods = listenToRecentMoods(familyId, (records) => setMoods(records));
    const unsubVoice = listenToVoiceMessages(familyId, (msgs) => setVoiceMessages(msgs));
    const unsubAlerts = listenToActiveAlerts(familyId, (alts) => setAlerts(alts));
    const unsubMeet = listenToFamilyMeeting(familyId, (meeting) => setActiveMeeting(meeting));
    return () => { unsubCheckIns(); unsubMoods(); unsubVoice(); unsubAlerts(); unsubMeet(); };
  }, [familyId, user?.uid]);

  const todayStr = getTodayDateStr();

  const todayFormattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("vi-VN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }, []);

  const handleCheckIn = async () => {
    if (hasChildCheckedInToday) { showToast("Bß║ín ─æ├ú check-in h├┤m nay"); return; }
    if (!user || !familyId || isCheckInLoading) return;
    setIsCheckInLoading(true);
    try {
      await recordCheckIn(user.uid, profile?.displayName || "Con", familyId,
        "T├┤i ß╗òn, cß║ú nh├á y├¬n t├óm nh├⌐!", "child", profile?.relationship || "Con c├íi");
      setHasChildCheckedInToday(true);
      showToast("─É├ú gß╗¡i th├┤ng b├ío b├¼nh an Γ£ô");
    } catch (error) {
      showToast("Lß╗ùi khi gß╗¡i check-in");
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
        relationship: settingsRelationship.trim() || "Con c├íi",
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
      showToast("─É├ú l╞░u c├ái ─æß║╖t th├ánh c├┤ng");
      refreshProfile();
    } catch (err) {
      showToast("Lß╗ùi khi l╞░u c├ái ─æß║╖t");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!familyId || !user) return;
    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      showToast("─Éang v├áo Google Meet...");
      try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, activeMeeting.meetUrl); } catch {}
      return;
    }
    let targetUrl = getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || "";
    if (!targetUrl) {
      try { targetUrl = await ensureOrAutoCreateFamilyFixedMeetUrl(familyId, family?.fixedMeetUrl); } catch {}
    }
    if (!targetUrl) { setShowMeetSetupModal(true); return; }
    showToast("─Éang v├áo Google Meet...");
    try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, targetUrl); } catch {}
  };

  // ΓöÇΓöÇΓöÇ NAV ITEMS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const navItems = [
    { id: "home" as const, label: "Trang chß╗º", icon: Home },
    { id: "family" as const, label: "Ng╞░ß╗¥i th├ón", icon: Users },
    { id: "settings" as const, label: "C├ái ─æß║╖t", icon: Settings },
  ];

  return (
    <>
      {/* ΓöÇΓöÇΓöÇ MAIN SHELL: Sidebar on desktop, stack on mobile ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div className="flex h-full w-full overflow-hidden">

        {/* ΓöÇΓöÇ DESKTOP SIDEBAR NAV ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <aside className="hidden md:flex flex-col w-[72px] lg:w-56 h-full bg-[#f9fafb] border-r border-[#e8eaed] shrink-0 py-4 px-2 lg:px-3 gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border-0 text-left w-full ${
                activeTab === id
                  ? "bg-[#e8f5ee] text-[#159447]"
                  : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${activeTab === id ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              <span className="hidden lg:block tracking-tight">{label}</span>
            </button>
          ))}

          {/* Spacer + sign out at bottom */}
          <div className="mt-auto">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border-0 bg-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-500 w-full text-left"
            >
              <LogOut className="w-5 h-5 shrink-0 stroke-[1.8]" />
              <span className="hidden lg:block tracking-tight">─É─âng xuß║Ñt</span>
            </button>
          </div>
        </aside>

        {/* ΓöÇΓöÇ CONTENT AREA ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ΓöÇΓöÇ TAB 1: HOME ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {activeTab === "home" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-hidden">
              <div className="w-full max-w-sm flex flex-col items-center gap-5 md:gap-6">

                {/* Date badge */}
                <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#f0f1f3] text-[#6b7280] text-xs font-medium tracking-wide">
                  {todayFormattedDate}
                </div>

                {/* Headline */}
                <div className="text-center space-y-1.5">
                  <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-black tracking-tight text-[#17191c] leading-[1.1]">
                    H├┤m nay bß║ín<br />vß║½n ß╗òn chß╗⌐?
                  </h1>
                  <p className="text-sm text-[#8b9096] leading-relaxed">
                    Chß║ím mß╗Öt lß║ºn ─æß╗â gia ─æ├¼nh biß║┐t bß║ín b├¼nh an.
                  </p>
                </div>

                {/* Hero Check-in Button */}
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    hasChildCheckedInToday
                      ? "shadow-[0_0_0_16px_rgba(21,148,71,0.08),0_0_0_32px_rgba(21,148,71,0.04)]"
                      : "shadow-[0_0_0_16px_rgba(40,180,99,0.08),0_0_0_32px_rgba(40,180,99,0.04)] animate-breathe"
                  }`} />
                  <button
                    id="childCheckBtn"
                    onClick={handleCheckIn}
                    disabled={isCheckInLoading}
                    className={`relative w-[200px] h-[200px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px] border-0 rounded-full text-white cursor-pointer select-none transition-all duration-300 flex flex-col items-center justify-center outline-none active:scale-95 disabled:opacity-80 ${
                      hasChildCheckedInToday
                        ? "bg-[#159447] shadow-[0_20px_60px_rgba(21,148,71,0.35)]"
                        : "bg-[#28b463] shadow-[0_20px_60px_rgba(40,180,99,0.3)] hover:shadow-[0_24px_70px_rgba(40,180,99,0.4)] hover:scale-[1.02]"
                    }`}
                  >
                    <svg
                      className={`w-9 h-9 md:w-11 md:h-11 lg:w-14 lg:h-14 mb-2 lg:mb-3 transition-all duration-300 ${
                        hasChildCheckedInToday ? "opacity-100" : "opacity-90"
                      }`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    >
                      <path d="m5 12 4.2 4.2L19 6.8" />
                    </svg>
                    <span className="text-[18px] md:text-[22px] lg:text-[26px] font-black leading-tight tracking-tight">
                      {isCheckInLoading ? "─Éang gß╗¡i..." : hasChildCheckedInToday ? "─É├ú b├¼nh an" : "B├ío b├¼nh an"}
                    </span>
                  </button>
                </div>

                {/* Status */}
                <div className="min-h-[32px] flex items-center justify-center">
                  {hasChildCheckedInToday ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f5ee] text-[#159447] font-semibold text-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                      ─É├ú gß╗¡i th├┤ng b├ío ─æß║┐n gia ─æ├¼nh
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-[#9ca3af] text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      H├┤m nay bß║ín ch╞░a check-in
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="w-full grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="btnAnalysis"
                    onClick={() => setShowAiModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#f0faf4] hover:bg-[#e4f7ec] border border-[#d1f0de] text-[#159447] font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Ph├ón t├¡ch AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#fff4f6] hover:bg-[#ffe8ec] border border-[#ffd0d8] text-[#d94b61] font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>Khß║⌐n cß║Ñp SOS</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ΓöÇΓöÇ TAB 2: FAMILY ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {activeTab === "family" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 sm:px-4 py-2">
              <FamilyMembersView parentName={parentName} isParentView={false} />
            </div>
          )}

          {/* ΓöÇΓöÇ TAB 3: SETTINGS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-lg mx-auto space-y-6">
                <h2 className="text-xl font-bold text-[#17191c] tracking-tight">C├ái ─æß║╖t</h2>

                {/* Profile Card */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e8eaed]">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Hß╗ô s╞í c├í nh├ón</p>
                  </div>
                  <form onSubmit={handleSaveInlineSettings} className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#6b7280]">T├¬n hiß╗ân thß╗ï</label>
                        <input
                          type="text" value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463] focus:ring-2 focus:ring-[#28b463]/10 transition-all"
                          placeholder="T├¬n cß╗ºa bß║ín" required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#6b7280]">X╞░ng h├┤ trong nh├á</label>
                        <input
                          type="text" value={settingsRelationship}
                          onChange={(e) => setSettingsRelationship(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463] focus:ring-2 focus:ring-[#28b463]/10 transition-all"
                          placeholder="VD: Con c├íi, Con g├íi..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b7280]">Sß╗æ ─æiß╗çn thoß║íi SOS</label>
                      <div className="relative">
                        <input
                          type="tel" value={settingsEmergencyPhone}
                          onChange={(e) => setSettingsEmergencyPhone(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463] focus:ring-2 focus:ring-[#28b463]/10 transition-all"
                          placeholder="VD: 0912345678"
                        />
                        <Phone className="w-4 h-4 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b7280] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#28b463]" /> Khung giß╗¥ check-in
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-[#9ca3af] block mb-1">Tß╗½ l├║c</span>
                          <select value={settingsStartHour} onChange={(e) => setSettingsStartHour(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463]">
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-xs text-[#9ca3af] block mb-1">─Éß║┐n l├║c</span>
                          <select value={settingsEndHour} onChange={(e) => setSettingsEndHour(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463]">
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={isSavingSettings}
                      className="w-full py-3 rounded-xl bg-[#28b463] hover:bg-[#159447] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                      <Save className="w-4 h-4" />
                      {isSavingSettings ? "─Éang l╞░u..." : "L╞░u c├ái ─æß║╖t"}
                    </button>
                  </form>
                </div>

                {/* Toggles Card */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden divide-y divide-[#e8eaed]">
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-3">Th├┤ng b├ío</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#17191c]">Nhß║»c check-in hß║▒ng ng├áy</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Gß╗¡i lß╗¥i nhß║»c v├áo mß╗ùi ng├áy</p>
                      </div>
                      <button type="button" onClick={() => { setDailyReminderToggle(!dailyReminderToggle); showToast(dailyReminderToggle ? "─É├ú tß║»t nhß║»c" : "─É├ú bß║¡t nhß║»c"); }}
                        className={`w-11 h-6 rounded-full relative cursor-pointer border-0 transition-colors ${dailyReminderToggle ? "bg-[#28b463]" : "bg-[#d1d5db]"}`}>
                        <span className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-all shadow-sm ${dailyReminderToggle ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#17191c]">Cß║únh b├ío khß║⌐n cß║Ñp</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Khi ng╞░ß╗¥i th├ón ch╞░a check-in</p>
                      </div>
                      <button type="button" onClick={() => { setEmergencyAlertToggle(!emergencyAlertToggle); showToast(emergencyAlertToggle ? "─É├ú tß║»t cß║únh b├ío" : "─É├ú bß║¡t cß║únh b├ío"); }}
                        className={`w-11 h-6 rounded-full relative cursor-pointer border-0 transition-colors ${emergencyAlertToggle ? "bg-[#28b463]" : "bg-[#d1d5db]"}`}>
                        <span className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-all shadow-sm ${emergencyAlertToggle ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden divide-y divide-[#e8eaed]">
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Quß║ún l├╜</p>
                  </div>
                  <button type="button" onClick={() => setShowFamilySettings(true)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f0f2f5] transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#17191c]">Th├ánh vi├¬n & M├ú mß╗¥i</p>
                      <p className="text-xs text-[#9ca3af]">Quß║ún l├╜ gia ─æ├¼nh</p>
                    </div>
                    <span className="text-[#d1d5db] text-lg">ΓÇ║</span>
                  </button>
                  <button type="button" onClick={() => setShowNearbyModal(true)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f0f2f5] transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#17191c]">C╞í sß╗ƒ y tß║┐ gß║ºn ─æ├óy</p>
                      <p className="text-xs text-[#9ca3af]">T├¼m trß║ím x├í, nh├á thuß╗æc</p>
                    </div>
                    <span className="text-[#d1d5db] text-lg">ΓÇ║</span>
                  </button>
                  <button type="button" onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-rose-600">─É─âng xuß║Ñt</p>
                      <p className="text-xs text-rose-400">Tho├ít phi├¬n ─æ─âng nhß║¡p</p>
                    </div>
                    <span className="text-rose-300 text-lg">ΓÇ║</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ΓöÇΓöÇ MOBILE BOTTOM NAV ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          <nav className="md:hidden shrink-0 h-16 bg-white/95 backdrop-blur-sm border-t border-slate-100 flex justify-around items-center px-4">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 border-0 bg-transparent cursor-pointer transition-colors ${
                  activeTab === id ? "text-[#159447]" : "text-slate-400"
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === id ? "stroke-[2.5]" : "stroke-2"}`} />
                <span className="text-[11px] font-medium tracking-tight">{label}</span>
              </button>
            ))}
          </nav>

        </div>
      </div>

      {/* ΓöÇΓöÇΓöÇ TOAST ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div className={`fixed left-1/2 bottom-8 -translate-x-1/2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-2xl text-sm font-medium pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl ${
        toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}>
        {toastMessage}
      </div>

      {/* ΓöÇΓöÇΓöÇ MODALS (all outside the main layout to avoid z-index issues) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {showAiModal && (
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
            setCalendarActionTitle(title || "Gß╗ìi hß╗Åi th─âm ng╞░ß╗¥i th├ón");
            setShowCalendarModal(true);
          }}
        />
      )}

      {showHelpModal && user && (
        <EmergencyHelpModal
          parentId={user.uid}
          parentName={profile?.displayName || "Con"}
          familyId={familyId}
          onClose={() => setShowHelpModal(false)}
          onOpenNearby={() => { setShowHelpModal(false); setShowNearbyModal(true); }}
        />
      )}

      {showNearbyModal && (
        <NearbyPlacesModal parentName={parentName} onClose={() => setShowNearbyModal(false)} />
      )}

      {showCalendarModal && (
        <CalendarDirectCreateModal
          defaultTitle={calendarActionTitle}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {showFamilySettings && family && (
        <FamilySettingsModal
          family={family}
          members={members}
          onClose={() => setShowFamilySettings(false)}
          onRefresh={refreshProfile}
        />
      )}

      {showMeetSetupModal && (
        <GoogleMeetSetupModal
          familyId={familyId}
          currentMeetUrl={getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || ""}
          onClose={() => setShowMeetSetupModal(false)}
          onSavedAndJoin={async (savedUrl) => {
            setShowMeetSetupModal(false);
            if (familyId && user) {
              await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, savedUrl);
            }
          }}
        />
      )}
    </>
  );
};
