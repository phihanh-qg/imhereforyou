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

  const parentMember = members.find((m) => m.role === "parent");
  const parentName = parentMember?.displayName || "Mẹ";

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

  const todayFormattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("vi-VN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }, []);

  const handleCheckIn = async () => {
    if (hasChildCheckedInToday) { showToast("Bạn đã check-in hôm nay"); return; }
    if (!user || !familyId || isCheckInLoading) return;
    setIsCheckInLoading(true);
    try {
      await recordCheckIn(user.uid, profile?.displayName || "Con", familyId,
        "Tôi ổn, cả nhà yên tâm nhé!", "child", profile?.relationship || "Con cái");
      setHasChildCheckedInToday(true);
      showToast("Đã gửi thông báo bình an ✓");
    } catch (error) {
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
      showToast("Lỗi khi lưu cài đặt");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!familyId || !user) return;
    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      showToast("Đang vào Google Meet...");
      try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, activeMeeting.meetUrl); } catch {}
      return;
    }
    let targetUrl = getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || "";
    if (!targetUrl) {
      try { targetUrl = await ensureOrAutoCreateFamilyFixedMeetUrl(familyId, family?.fixedMeetUrl); } catch {}
    }
    if (!targetUrl) { setShowMeetSetupModal(true); return; }
    showToast("Đang vào Google Meet...");
    try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, targetUrl); } catch {}
  };

  const navItems = [
    { id: "home" as const, label: "Trang chủ", icon: Home },
    { id: "family" as const, label: "Người thân", icon: Users },
    { id: "settings" as const, label: "Cài đặt", icon: Settings },
  ];

  return (
    <>
      {/* MAIN SHELL */}
      <div className="flex h-full w-full overflow-hidden">

        {/* DESKTOP SIDEBAR */}
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

          <div className="mt-auto">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border-0 bg-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-500 w-full text-left"
            >
              <LogOut className="w-5 h-5 shrink-0 stroke-[1.8]" />
              <span className="hidden lg:block tracking-tight">Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-hidden">
              <div className="w-full max-w-sm flex flex-col items-center gap-5 md:gap-6">

                <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#f0f1f3] text-[#6b7280] text-xs font-medium tracking-wide">
                  {todayFormattedDate}
                </div>

                <div className="text-center space-y-1.5">
                  <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-black tracking-tight text-[#17191c] leading-[1.1]">
                    Hôm nay bạn<br />vẫn ổn chứ?
                  </h1>
                  <p className="text-sm text-[#8b9096] leading-relaxed">
                    Chạm một lần để gia đình biết bạn bình an.
                  </p>
                </div>

                {/* Hero Check-in Button */}
                <div className="relative">
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
                      className="w-9 h-9 md:w-11 md:h-11 lg:w-14 lg:h-14 mb-2 lg:mb-3"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    >
                      <path d="m5 12 4.2 4.2L19 6.8" />
                    </svg>
                    <span className="text-[18px] md:text-[22px] lg:text-[26px] font-black leading-tight tracking-tight">
                      {isCheckInLoading ? "Đang gửi..." : hasChildCheckedInToday ? "Đã bình an" : "Báo bình an"}
                    </span>
                  </button>
                </div>

                {/* Status */}
                <div className="min-h-[32px] flex items-center justify-center">
                  {hasChildCheckedInToday ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f5ee] text-[#159447] font-semibold text-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                      Đã gửi thông báo đến gia đình
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-[#9ca3af] text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Hôm nay bạn chưa check-in
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
                    <span>Phân tích (AI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#fff4f6] hover:bg-[#ffe8ec] border border-[#ffd0d8] text-[#d94b61] font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>Trợ giúp khẩn cấp (SOS)</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: FAMILY */}
          {activeTab === "family" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 sm:px-4 py-2">
              <FamilyMembersView parentName={parentName} isParentView={false} />
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-lg mx-auto space-y-6">
                <h2 className="text-xl font-bold text-[#17191c] tracking-tight">Cài đặt</h2>

                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e8eaed]">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Hồ sơ cá nhân</p>
                  </div>
                  <form onSubmit={handleSaveInlineSettings} className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#6b7280]">Tên hiển thị</label>
                        <input
                          type="text" value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463] focus:ring-2 focus:ring-[#28b463]/10 transition-all"
                          placeholder="Tên của bạn" required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#6b7280]">Xưng hô trong nhà</label>
                        <input
                          type="text" value={settingsRelationship}
                          onChange={(e) => setSettingsRelationship(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463] focus:ring-2 focus:ring-[#28b463]/10 transition-all"
                          placeholder="VD: Con cái, Con gái..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b7280]">Số điện thoại SOS</label>
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
                        <Clock className="w-3.5 h-3.5 text-[#28b463]" /> Khung giờ check-in
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-[#9ca3af] block mb-1">Từ lúc</span>
                          <select value={settingsStartHour} onChange={(e) => setSettingsStartHour(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[#e2e5e9] text-sm bg-white focus:outline-none focus:border-[#28b463]">
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-xs text-[#9ca3af] block mb-1">Đến lúc</span>
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
                      {isSavingSettings ? "Đang lưu..." : "Lưu cài đặt"}
                    </button>
                  </form>
                </div>

                {/* Toggles */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden divide-y divide-[#e8eaed]">
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-3">Thông báo</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#17191c]">Nhắc check-in hằng ngày</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Gửi lời nhắc vào mỗi ngày</p>
                      </div>
                      <button type="button" onClick={() => { setDailyReminderToggle(!dailyReminderToggle); showToast(dailyReminderToggle ? "Đã tắt nhắc" : "Đã bật nhắc"); }}
                        className={`w-11 h-6 rounded-full relative cursor-pointer border-0 transition-colors ${dailyReminderToggle ? "bg-[#28b463]" : "bg-[#d1d5db]"}`}>
                        <span className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-all shadow-sm ${dailyReminderToggle ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#17191c]">Cảnh báo khẩn cấp</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Khi người thân chưa check-in</p>
                      </div>
                      <button type="button" onClick={() => { setEmergencyAlertToggle(!emergencyAlertToggle); showToast(emergencyAlertToggle ? "Đã tắt cảnh báo" : "Đã bật cảnh báo"); }}
                        className={`w-11 h-6 rounded-full relative cursor-pointer border-0 transition-colors ${emergencyAlertToggle ? "bg-[#28b463]" : "bg-[#d1d5db]"}`}>
                        <span className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-all shadow-sm ${emergencyAlertToggle ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] overflow-hidden divide-y divide-[#e8eaed]">
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Quản lý</p>
                  </div>
                  <button type="button" onClick={() => setShowFamilySettings(true)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f0f2f5] transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#17191c]">Thành viên & Mã mời</p>
                      <p className="text-xs text-[#9ca3af]">Quản lý gia đình</p>
                    </div>
                    <span className="text-[#d1d5db] text-lg">›</span>
                  </button>
                  <button type="button" onClick={() => setShowNearbyModal(true)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f0f2f5] transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#17191c]">Cơ sở y tế gần đây</p>
                      <p className="text-xs text-[#9ca3af]">Tìm trạm xá, nhà thuốc</p>
                    </div>
                    <span className="text-[#d1d5db] text-lg">›</span>
                  </button>
                  <button type="button" onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent text-left">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-rose-600">Đăng xuất</p>
                      <p className="text-xs text-rose-400">Thoát phiên đăng nhập</p>
                    </div>
                    <span className="text-rose-300 text-lg">›</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MOBILE BOTTOM NAV */}
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

      {/* TOAST */}
      <div className={`fixed left-1/2 bottom-8 -translate-x-1/2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-2xl text-sm font-medium pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl ${
        toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}>
        {toastMessage}
      </div>

      {/* MODALS */}
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
            setCalendarActionTitle(title || "Gọi hỏi thăm người thân");
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
