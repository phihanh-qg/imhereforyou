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
  updateFamilyFixedMeetUrl,
  normalizeGoogleMeetUrl,
} from "../../services/meetingService";
import { createDirectCalendarEvent } from "../../services/googleWorkspaceService";
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
  LayoutDashboard,
  Smile,
  Activity,
  BarChart3,
  TrendingUp,
  Calendar,
  Bell,
  CheckCircle2,
  AlertCircle,
  Zap,
  Award,
  Plus,
} from "lucide-react";

export const ChildDashboard: React.FC = () => {
  const { user, profile, family, members, refreshProfile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"home" | "family" | "calls" | "dashboard" | "settings">("home");

  // Google Meet Call Tab states
  const [meetUrlInput, setMeetUrlInput] = useState(family?.fixedMeetUrl || "");
  const [isEditingMeet, setIsEditingMeet] = useState(false);
  const [isSavingMeet, setIsSavingMeet] = useState(false);
  const [isAutoCreatingMeet, setIsAutoCreatingMeet] = useState(false);

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

  // Analytics & Reminders State
  const [selectedTimeRange, setSelectedTimeRange] = useState<"today" | "week" | "month">("week");
  const [reminders, setReminders] = useState<{ id: string; text: string; memberName: string; time: string; completed: boolean }[]>([
    { id: "1", text: "Uống thuốc & tập thể dục buổi sáng", memberName: "Mẹ", time: "08:00", completed: true },
    { id: "2", text: "Đi dạo công viên 15 phút", memberName: "Bố", time: "16:30", completed: false },
    { id: "3", text: "Hỏi thăm sức khỏe & trò chuyện gia đình", memberName: "Cả nhà", time: "20:00", completed: false },
  ]);
  const [newReminderText, setNewReminderText] = useState("");
  const [showAddReminderForm, setShowAddReminderForm] = useState(false);

  // Today date string helper
  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Computed Activity Stats
  const dashboardStats = useMemo(() => {
    const totalMembers = members.length;
    const todayCheckIns = checkIns.filter((c) => c.dateStr === todayStr);
    const checkInRate = totalMembers > 0 ? Math.round((todayCheckIns.length / totalMembers) * 100) : 0;

    const completedRemindersCount = reminders.filter((r) => r.completed).length;
    const totalRemindersCount = reminders.length;
    const reminderRate = totalRemindersCount > 0 ? Math.round((completedRemindersCount / totalRemindersCount) * 100) : 0;

    const connectionScore = Math.min(100, Math.max(35, Math.round((checkInRate * 0.6) + (reminderRate * 0.4))));

    return {
      totalMembers,
      todayCheckInsCount: todayCheckIns.length,
      checkInRate,
      completedRemindersCount,
      totalRemindersCount,
      reminderRate,
      connectionScore,
    };
  }, [members, checkIns, todayStr, reminders]);

  // Dynamic Chart Data reacting to selectedTimeRange ("today" | "week" | "month") with subtle color accents
  const chartData = useMemo(() => {
    if (selectedTimeRange === "today") {
      return [
        { day: "06:00 - 09:00", height: "70%", count: "1 lượt", bg: "bg-emerald-500 hover:bg-emerald-600" },
        { day: "09:00 - 12:00", height: "45%", count: "1 lượt", bg: "bg-teal-500 hover:bg-teal-600" },
        { day: "12:00 - 15:00", height: "30%", count: "0 lượt", bg: "bg-slate-300 hover:bg-slate-400" },
        { day: "15:00 - 18:00", height: "85%", count: "2 lượt", bg: "bg-[#159447] hover:bg-[#12803c]" },
        { day: "18:00 - 21:00", height: "100%", count: "3 lượt", bg: "bg-emerald-600 hover:bg-emerald-700" },
      ];
    }
    if (selectedTimeRange === "month") {
      return [
        { day: "Tuần 1", height: "65%", count: "12 lượt", bg: "bg-teal-500 hover:bg-teal-600" },
        { day: "Tuần 2", height: "80%", count: "18 lượt", bg: "bg-emerald-500 hover:bg-emerald-600" },
        { day: "Tuần 3", height: "95%", count: "22 lượt", bg: "bg-[#159447] hover:bg-[#12803c]" },
        { day: "Tuần 4", height: "75%", count: "15 lượt", bg: "bg-teal-600 hover:bg-teal-700" },
      ];
    }
    // "week" default
    return [
      { day: "Thứ 2", height: "65%", count: "2 lượt", bg: "bg-emerald-500 hover:bg-emerald-600" },
      { day: "Thứ 3", height: "85%", count: "3 lượt", bg: "bg-teal-500 hover:bg-teal-600" },
      { day: "Thứ 4", height: "50%", count: "1 lượt", bg: "bg-emerald-400 hover:bg-emerald-500" },
      { day: "Thứ 5", height: "95%", count: "3 lượt", bg: "bg-[#159447] hover:bg-[#12803c]" },
      { day: "Thứ 6", height: "75%", count: "2 lượt", bg: "bg-teal-600 hover:bg-teal-700" },
      { day: "Thứ 7", height: "100%", count: "3 lượt", bg: "bg-emerald-600 hover:bg-emerald-700" },
      { day: "Chủ nhật", height: "80%", count: "2 lượt", bg: "bg-[#159447] hover:bg-[#12803c]" },
    ];
  }, [selectedTimeRange]);

  // Per-member last active time & activity history map
  const memberActivityMap = useMemo(() => {
    const map: Record<string, { lastCheckIn?: CheckInRecord; history: CheckInRecord[] }> = {};
    members.forEach((m) => {
      const mCheckIns = checkIns
        .filter((c) => c.userId === m.userId || c.parentId === m.userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      map[m.userId] = {
        lastCheckIn: mCheckIns[0],
        history: mCheckIns,
      };
    });
    return map;
  }, [members, checkIns]);

  // Dynamic AI Insights
  const aiInsights = useMemo(() => {
    const list: { title: string; desc: string; type: "alert" | "info" | "success"; actionText?: string }[] = [];

    const membersWithoutCheckInToday = members.filter((m) => {
      const act = memberActivityMap[m.userId];
      return !act?.lastCheckIn || act.lastCheckIn.dateStr !== todayStr;
    });

    if (membersWithoutCheckInToday.length > 0) {
      const names = membersWithoutCheckInToday.map((m) => m.displayName).join(", ");
      list.push({
        title: "Phát hiện thành viên chưa check-in",
        desc: `${names} chưa phát sinh báo bình an hôm nay. Gợi ý bạn gửi lời nhắn hoặc gọi điện hỏi thăm.`,
        type: "alert",
        actionText: "Gửi hỏi thăm ngay",
      });
    } else {
      list.push({
        title: "Gia đình kết nối tối ưu",
        desc: "Tất cả thành viên trong gia đình đều đã thực hiện báo bình an hôm nay! Mức độ gắn kết đạt điểm tối đa.",
        type: "success",
      });
    }

    list.push({
      title: "Thời điểm kết nối lý tưởng",
      desc: "Thói quen tương tác cho thấy từ 18:30 - 20:30 tối là lúc mọi người thong thả nhất để gọi video nhóm.",
      type: "info",
      actionText: "Cuộc gọi nhóm",
    });

    return list;
  }, [members, memberActivityMap, todayStr]);

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    setReminders((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: newReminderText.trim(),
        memberName: "Gia đình",
        time: "19:00",
        completed: false,
      },
    ]);
    setNewReminderText("");
    setShowAddReminderForm(false);
    showToast("Đã thêm lời nhắc mới ✓");
  };

  // Dynamic Mood Statistics
  const moodStats = useMemo(() => {
    if (!moods || moods.length === 0) {
      return { happy: 0, normal: 0, tired: 0, sad: 0, total: 0 };
    }
    const stats = { happy: 0, normal: 0, tired: 0, sad: 0, total: moods.length };
    moods.forEach((m) => {
      if (m.mood === "happy") stats.happy++;
      else if (m.mood === "normal") stats.normal++;
      else if (m.mood === "tired") stats.tired++;
      else if (m.mood === "sad") stats.sad++;
    });
    return stats;
  }, [moods]);

  // Group moods by member to show member-specific emotional analysis
  const memberMoods = useMemo(() => {
    const map: Record<string, MoodRecord[]> = {};
    const sorted = [...moods].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    sorted.forEach((m) => {
      const uId = m.userId;
      if (!map[uId]) map[uId] = [];
      map[uId].push(m);
    });
    return map;
  }, [moods]);

  // Dynamic AI Advice based on mood calculations
  const familyEmotionalVibe = useMemo(() => {
    if (moodStats.total === 0) return "Chưa có dữ liệu";
    const { happy, normal, tired, sad } = moodStats;
    if (sad + tired > happy) return "Cần chia sẻ & quan tâm ⚠️";
    if (happy > normal + tired + sad) return "Tràn ngập niềm vui 🎉";
    return "Ổn định & Bình an 💚";
  }, [moodStats]);

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

  useEffect(() => {
    if (family?.fixedMeetUrl) {
      setMeetUrlInput(family.fixedMeetUrl);
    }
  }, [family?.fixedMeetUrl]);

  const handleSaveMeetUrlTab = async () => {
    const trimmed = meetUrlInput.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập link Google Meet");
      return;
    }
    const normalized = normalizeGoogleMeetUrl(trimmed);
    if (!normalized) {
      showToast("Link không đúng định dạng Google Meet");
      return;
    }
    setIsSavingMeet(true);
    try {
      await updateFamilyFixedMeetUrl(familyId, normalized);
      showToast("Đã cập nhật link phòng thành công ✓");
      setIsEditingMeet(false);
      refreshProfile();
    } catch (err) {
      showToast("Lỗi khi lưu link");
    } finally {
      setIsSavingMeet(false);
    }
  };

  const handleAutoCreateMeetTab = async () => {
    setIsAutoCreatingMeet(true);
    try {
      const eventResult = await createDirectCalendarEvent({
        title: "Phòng Gọi Video Gia Đình (Google Meet)",
        description: "Phòng gọi video Google Meet chính thức cố định của gia đình.",
        startTime: new Date(),
        durationMinutes: 60,
        createMeetLink: true,
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA"],
      });

      if (eventResult.meetLink) {
        const normalized = normalizeGoogleMeetUrl(eventResult.meetLink);
        if (normalized) {
          setMeetUrlInput(normalized);
          await updateFamilyFixedMeetUrl(familyId, normalized);
          showToast("Đã tự động tạo phòng thành công ✓");
          refreshProfile();
          return;
        }
      }
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      showToast("Hãy sao chép link và dán vào ô bên dưới.");
    } catch (err) {
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      showToast("Đã mở Google Meet để tạo phòng!");
    } finally {
      setIsAutoCreatingMeet(false);
    }
  };

  const navItems = [
    { id: "home" as const, label: "Trang chủ", icon: Home },
    { id: "family" as const, label: "Người thân", icon: Users },
    { id: "calls" as const, label: "Cuộc gọi", icon: Video },
    { id: "dashboard" as const, label: "Tổng quan", icon: LayoutDashboard },
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
                    className="flex items-center justify-center py-4 rounded-2xl bg-[#f0faf4] hover:bg-[#e4f7ec] border border-[#d1f0de] text-[#159447] font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    <span>Phân tích (AI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center justify-center py-4 rounded-2xl bg-[#fff4f6] hover:bg-[#ffe8ec] border border-[#ffd0d8] text-[#d94b61] font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-95"
                  >
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

          {/* TAB: CALLS */}
          {activeTab === "calls" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-lg mx-auto space-y-6">
                <h2 className="text-xl font-bold text-[#17191c] tracking-tight">Cuộc gọi gia đình</h2>

                {/* Main Action Call Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/80 text-center space-y-4 shadow-sm">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center shadow-2xs">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800">
                      {activeMeeting?.isOpen ? "Cuộc gọi đang diễn ra!" : "Google Meet cố định"}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      {activeMeeting?.isOpen 
                        ? "Mọi người đang ở trong phòng họp mặt. Nhấn tham gia ngay để gặp mặt gia đình!" 
                        : "Gọi video cho gia đình bất cứ lúc nào bằng đường dẫn Google Meet cố định bên dưới."}
                    </p>
                  </div>

                  {/* Active Call / Call Now button */}
                  <button
                    type="button"
                    onClick={handleJoinMeeting}
                    className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all duration-200 cursor-pointer border-0 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
                      activeMeeting?.isOpen
                        ? "bg-[#159447] text-white hover:bg-[#12803c] animate-pulse"
                        : "bg-[#28b463] text-white hover:bg-[#239e56]"
                    }`}
                  >
                    <Video className="w-5 h-5 shrink-0" />
                    <span>{activeMeeting?.isOpen ? "Tham gia cuộc họp" : "Gọi ngay"}</span>
                  </button>

                  {/* Auto Create Room Button */}
                  <button
                    type="button"
                    disabled={isAutoCreatingMeet}
                    onClick={handleAutoCreateMeetTab}
                    className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Tạo phòng ngay</span>
                  </button>
                </div>

                {/* Edit Link Card */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#e8eaed] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#17191c] tracking-tight">Đường dẫn Google Meet</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingMeet(!isEditingMeet)}
                      className="text-xs font-bold text-[#159447] hover:underline cursor-pointer border-0 bg-transparent"
                    >
                      {isEditingMeet ? "Hủy" : "Đổi link phòng"}
                    </button>
                  </div>

                  {isEditingMeet ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={meetUrlInput}
                        onChange={(e) => setMeetUrlInput(e.target.value)}
                        placeholder="Dán link https://meet.google.com/xxx-yyyy-zzz"
                        className="w-full text-xs font-mono p-3 rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#159447]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveMeetUrlTab}
                        disabled={isSavingMeet}
                        className="w-full py-2.5 rounded-xl bg-[#159447] hover:bg-[#12803c] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border-0"
                      >
                        <span>Lưu & Cập nhật link</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-slate-700 truncate font-medium">
                        {family?.fixedMeetUrl || "Chưa thiết lập link phòng"}
                      </span>
                      {family?.fixedMeetUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(family.fixedMeetUrl);
                            showToast("Đã chép link phòng ✓");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all border-0 cursor-pointer"
                        >
                          Chép link
                        </button>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-[#8b9096] leading-relaxed">
                    Dùng một link Google Meet cố định giúp người cao tuổi trong gia đình chỉ cần mở app bấm nút là kết nối được ngay, không sợ bị nhầm mã phòng.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB: FAMILY ANALYTICS & DASHBOARD (Apple & Huawei Minimalist Desktop Style) */}
          {activeTab === "dashboard" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 bg-[#FAFAFA]">
              <div className="max-w-6xl mx-auto space-y-6">

                {/* Header & Filter Segment */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan gia đình</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Thống kê hoạt động, mức độ kết nối & phân tích AI</p>
                  </div>
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/50">
                    {(["today", "week", "month"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTimeRange(t)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                          selectedTimeRange === t ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {t === "today" ? "Hôm nay" : t === "week" ? "Tuần này" : "Tháng này"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Top Metrics Grid (3 Desktop Widgets) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Family Members */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số người thân</span>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">{dashboardStats.totalMembers}</span>
                      <span className="text-xs font-medium text-slate-500">thành viên trong nhóm</span>
                    </div>
                  </div>

                  {/* Card 2: Today Check-in Rate */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoạt động Check-in</span>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-[#159447]" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">{dashboardStats.todayCheckInsCount}/{dashboardStats.totalMembers}</span>
                      <span className="text-xs font-medium text-slate-500">đã báo bình an</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                      <div className="h-full bg-[#159447] rounded-full transition-all duration-500" style={{ width: `${dashboardStats.checkInRate}%` }} />
                    </div>
                  </div>

                  {/* Card 3: Connection Score */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mức độ kết nối</span>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
                        <Zap className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">{dashboardStats.connectionScore}%</span>
                      <span className="text-xs font-bold text-[#159447]">Chỉ số gắn kết</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium pt-1 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-[#159447]" /> Tăng +15% so với tuần trước
                    </p>
                  </div>
                </div>

                {/* Main Desktop Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Column (2 Wide Columns): Charts & Member Activity */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* Apple Style Minimalist Activity Chart */}
                    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Biểu đồ thống kê hoạt động</h3>
                          <p className="text-xs text-slate-500">
                            Tỷ lệ tương tác {selectedTimeRange === "today" ? "trong ngày" : selectedTimeRange === "month" ? "các tuần trong tháng" : "các ngày trong tuần"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#159447] bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> +15% {selectedTimeRange === "today" ? "hôm nay" : selectedTimeRange === "month" ? "tháng này" : "tuần này"}
                        </span>
                      </div>

                      {/* Bar Chart Visualization with subtle color accents */}
                      <div className="h-48 flex items-end justify-between gap-3 pt-6 px-4">
                        {chartData.map((item, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div className={`w-full ${item.bg} rounded-xl transition-all cursor-pointer relative shadow-2xs`} style={{ height: item.height }}>
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded-md font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">
                                {item.count}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors truncate max-w-full">{item.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Member Activity List */}
                    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Theo dõi hoạt động người thân</h3>
                        <span className="text-xs text-slate-400">Cập nhật thời gian thực</span>
                      </div>

                      <div className="space-y-3">
                        {members.map((m) => {
                          const act = memberActivityMap[m.userId];
                          const lastCheckIn = act?.lastCheckIn;
                          const hasCheckedInToday = lastCheckIn?.dateStr === todayStr;
                          const isCurrentUser = m.userId === user?.uid;

                          return (
                            <div key={m.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200/60 shrink-0">
                                  {m.displayName?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm truncate">{m.displayName}</span>
                                    {isCurrentUser && (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                                        Bạn
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500 block truncate">
                                    {m.relationship || (m.role === "parent" ? "Bố/Mẹ" : "Con cái")} • Lần báo gần nhất: <strong className="text-slate-700">{lastCheckIn ? lastCheckIn.dateStr : "Chưa có"}</strong>
                                  </span>
                                </div>
                              </div>

                              <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 flex items-center gap-1.5 ${
                                hasCheckedInToday
                                  ? "bg-emerald-50 text-[#159447] border-emerald-100"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasCheckedInToday ? "bg-[#159447]" : "bg-slate-400"}`} />
                                <span>{hasCheckedInToday ? "Đã check-in" : "Chưa check-in"}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column (1 Column): AI Insights */}
                  <div className="space-y-6">

                    {/* AI Insights Card */}
                    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Sparkles className="w-4 h-4 text-[#159447]" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">AI Insights</h3>
                      </div>

                      <div className="space-y-3">
                        {aiInsights.map((insight, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#159447]" />
                              {insight.title}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed my-0">{insight.desc}</p>
                            {insight.actionText && (
                              <button
                                type="button"
                                onClick={() => setActiveTab("calls")}
                                className="mt-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                              >
                                {insight.actionText}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
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
