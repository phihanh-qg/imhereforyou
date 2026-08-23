#!/bin/bash
cat << 'INNER_EOF' > /tmp/ChildDashboard.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CheckInRecord,
  MoodRecord,
  VoiceMessageRecord,
  AlertRecord,
  AiInsightRecord,
  MoodType,
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
  fetchAiFamilyInsight,
  listenToLatestAiInsight,
  fetchWeeklySummary,
} from "../../services/aiService";
import { isCheckInWindowMissed } from "../../services/notificationService";
import { openGoogleMeetInstant } from "../../services/googleWorkspaceService";

import { NotificationBanner } from "../common/NotificationBanner";
import { AiInsightCard } from "./AiInsightCard";
import { CheckInHistoryView } from "./CheckInHistoryView";
import { CalendarDirectCreateModal } from "./CalendarDirectCreateModal";
import { FamilySettingsModal } from "./FamilySettingsModal";
import { NearbyPlacesModal } from "../common/NearbyPlacesModal";
import { FamilyChatView } from "../common/FamilyChatView";

import {
  Heart,
  Calendar,
  Activity,
  Phone,
  Clock,
  Sparkles,
  Users,
  Settings,
  Smile,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  Video,
  MapPin,
  MessageSquare,
  Send,
} from "lucide-react";

export const ChildDashboard: React.FC = () => {
  const { user, profile, family, members, refreshProfile } = useAuth();
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "history">("overview");

  // Real-time Firestore records
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessageRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [aiInsight, setAiInsight] = useState<AiInsightRecord | null>(null);
  const [weeklySummaryText, setWeeklySummaryText] = useState<string>("");

  // Child's own check-in state (2-way check-in)
  const [isChildCheckingIn, setIsChildCheckingIn] = useState<boolean>(false);
  const [childCustomNote, setChildCustomNote] = useState<string>("");
  const [showChildNoteInput, setShowChildNoteInput] = useState<boolean>(false);

  // Loading & Modals
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarActionTitle, setCalendarActionTitle] = useState<string>("");
  const [showFamilySettings, setShowFamilySettings] = useState<boolean>(false);
  const [showNearbyModal, setShowNearbyModal] = useState<boolean>(false);
  const [parentLastLocation, setParentLastLocation] = useState<{ lat: number; lng: number } | null>(null);

  const familyId = profile?.familyId || "";

  // Identify the parent in this family
  const parentMember = members.find((m) => m.role === "parent");
  const parentName = parentMember?.displayName || "Mẹ";
  const parentRelationship = parentMember?.relationship || "Mẹ";

  // Real-time Listeners
  useEffect(() => {
    if (!familyId) return;

    const unsubCheckIns = listenToRecentCheckIns(familyId, (records) => {
      setCheckIns(records);
    });
    const unsubMoods = listenToRecentMoods(familyId, (records) => {
      setMoods(records);
    });
    const unsubVoice = listenToVoiceMessages(familyId, (msgs) => {
      setVoiceMessages(msgs);
    });
    const unsubAlerts = listenToActiveAlerts(familyId, (alts) => {
      setAlerts(alts);
      const activeWithLoc = alts.find((a) => a.location?.lat && a.location?.lng);
      if (activeWithLoc?.location) {
        setParentLastLocation({
          lat: activeWithLoc.location.lat,
          lng: activeWithLoc.location.lng,
        });
      }
    });
    const unsubAi = listenToLatestAiInsight(familyId, (insight) => {
      if (insight) {
        setAiInsight(insight);
      }
    });

    return () => {
      unsubCheckIns();
      unsubMoods();
      unsubVoice();
      unsubAlerts();
      unsubAi();
    };
  }, [familyId]);

  // Check today's check-in state
  const todayStr = getTodayDateStr();
  
  // Parent's checkin & mood
  const parentCheckIns = checkIns.filter(
    (c) => c.userRole === "parent" || c.parentId === parentMember?.userId || (!c.userRole && c.parentId)
  );
  const latestParentCheckIn = parentCheckIns[0] || null;
  const todayParentCheckIn = parentCheckIns.find((c) => c.dateStr === todayStr) || null;
  const hasParentCheckedInToday = !!todayParentCheckIn;

  const parentMoods = moods.filter(
    (m) => m.userRole === "parent" || m.parentId === parentMember?.userId || (!m.userRole && m.parentId)
  );
  const todayParentMood = parentMoods.find((m) => m.dateStr === todayStr) || null;
  const latestParentMood = parentMoods[0] || null;

  // Child's own check-in & mood
  const myCheckIn = checkIns.find(
    (c) => (c.userId === user?.uid || c.parentId === user?.uid) && c.dateStr === todayStr
  );
  const hasChildCheckedInToday = !!myCheckIn;

  const myMood = moods.find(
    (m) => (m.userId === user?.uid || m.parentId === user?.uid) && m.dateStr === todayStr
  );

  // Check if check-in window is missed
  const missedCheckIn = isCheckInWindowMissed(profile?.checkInWindow, hasParentCheckedInToday);

  // Handle Child Check-In (2-Way Reassurance)
  const handleChildCheckIn = async (noteText?: string) => {
    if (!user || !familyId || isChildCheckingIn) return;
    setIsChildCheckingIn(true);
    try {
      const note =
        noteText ||
        childCustomNote.trim() ||
        "Con ổn hôm nay, công việc thuận lợi, bố mẹ đừng lo nhé ❤️";

      await recordCheckIn(
        user.uid,
        profile?.displayName || "Con",
        familyId,
        note,
        "child",
        profile?.relationship || "Con"
      );
      setShowChildNoteInput(false);
      setChildCustomNote("");
    } catch (err) {
      console.error("Child checkin error:", err);
    } finally {
      setIsChildCheckingIn(false);
    }
  };

  // Handle Child Mood selection
  const handleSelectChildMood = async (mood: MoodType, label: string) => {
    if (!user || !familyId) return;
    try {
      await recordMood(
        user.uid,
        familyId,
        mood,
        label,
        profile?.displayName || "Con",
        "child"
      );
    } catch (err) {
      console.error("Child mood error:", err);
    }
  };

  // Trigger Gemini Analysis
  const handleRunAiAnalysis = async () => {
    if (!familyId || !parentMember) return;
    setIsAiLoading(true);
    try {
      const voiceTranscripts = voiceMessages
        .filter((v) => v.senderRole === "parent" && v.transcript)
        .slice(0, 5)
        .map((v) => v.transcript!);

      const missedDaysCount = 7 - parentCheckIns.filter((c) => {
        const diff = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }).length;

      const insight = await fetchAiFamilyInsight(
        familyId,
        parentMember.userId,
        parentName,
        parentRelationship,
        parentCheckIns.slice(0, 14),
        parentMoods.slice(0, 14),
        voiceTranscripts,
        Math.max(0, missedDaysCount),
        profile?.checkInWindow || { startHour: 7, endHour: 10 }
      );
      setAiInsight(insight);
    } catch (err) {
      console.error("AI Analysis error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch weekly summary once on mount if check-ins exist
  useEffect(() => {
    if (parentCheckIns.length > 0 && parentName) {
      const weeklyStats = {
        checkInCount: parentCheckIns.filter((c) => {
          const diff = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 3600 * 24);
          return diff <= 7;
        }).length,
        dominantMood: latestParentMood?.moodLabel || "Ổn định",
        voiceCount: voiceMessages.filter((v) => v.senderRole === "parent").length,
        alertsCount: alerts.length,
      };

      fetchWeeklySummary(parentName, weeklyStats).then((res) => {
        if (res) setWeeklySummaryText(res);
      });
    }
  }, [parentCheckIns.length, parentName, latestParentMood?.moodLabel, voiceMessages.length, alerts.length]);

  // Format relative check-in time
  const getFormattedCheckInTime = (record: CheckInRecord | null) => {
    if (!record) return "Chưa có dữ liệu";
    const d = new Date(record.timestamp);
    const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (record.dateStr === todayStr) {
      return `${timeStr} (Hôm nay)`;
    }
    return `${timeStr} (${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })})`;
  };

  const handleCallParent = () => {
    const phone = profile?.emergencyPhone || profile?.phoneNumber || "0900000000";
    window.open(`tel:${phone}`, "_self");
  };

  const handleStartMeet = () => {
    openGoogleMeetInstant();
  };

  const getMoodBadge = (mood?: MoodRecord | null) => {
    if (!mood) return { emoji: "—", label: "Chưa ghi nhận" };
    switch (mood.mood) {
      case "happy":
        return { emoji: "😊", label: "Vui vẻ" };
      case "normal":
        return { emoji: "🙂", label: "Bình thường" };
      case "tired":
        return { emoji: "😓", label: "Hơi mệt" };
      case "sad":
        return { emoji: "😔", label: "Không vui" };
      default:
        return { emoji: "🙂", label: mood.moodLabel || "Bình thường" };
    }
  };

  const activeParentMoodInfo = getMoodBadge(todayParentMood || latestParentMood);

  const childMoodOptions: { type: MoodType; emoji: string; label: string }[] = [
    { type: "happy", emoji: "😊", label: "Vui vẻ, khỏe mạnh" },
    { type: "normal", emoji: "💼", label: "Bận rộn, thuận lợi" },
    { type: "tired", emoji: "🥱", label: "Hơi mệt một chút" },
    { type: "sad", emoji: "❤️", label: "Nhớ bố mẹ nhiều" },
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-24 pt-4 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Emergency / Notification Banner */}
        <NotificationBanner
          alerts={alerts}
          missedCheckIn={missedCheckIn}
          parentName={parentName}
          onCallParent={handleCallParent}
        />

        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setShowNearbyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E5DACD] text-rose-600 hover:bg-rose-50 text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            title="Tìm bệnh viện/nhà thuốc gần đây"
          >
            <MapPin className="w-4 h-4" />
            <span>Y tế & Cứu hộ</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & MUTUAL 2-WAY REASSURANCE */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* 1. THÔNG TIN NGƯỜI THÂN (PARENT CARD) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F5F0E6] space-y-6">
              {/* Header: Avatar, Name, Status */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                   <img src="/logo.png" alt="Logo" className="w-full h-full object-cover p-2" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {parentName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {hasParentCheckedInToday ? (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã báo an tâm
                      </span>
                    ) : (
                      <span className="text-[#D97757] font-bold text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D97757]"></span> Đang đợi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCallParent}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition-colors flex-1 justify-center"
                >
                  <PhoneCall className="w-5 h-5" />
                  Gọi cho {parentName}
                </button>
                <button
                  onClick={handleStartMeet}
                  className="px-5 py-3 rounded-2xl bg-white border border-[#E5DACD] hover:bg-[#FAFAF8] text-slate-700 font-bold flex items-center gap-2 transition-colors flex-1 justify-center"
                >
                  <Video className="w-5 h-5 text-[#D97757]" />
                  Google Meet
                </button>
              </div>

              {/* Detailed Status (Not a dashboard grid, just a readable list) */}
              <div className="bg-[#FDFBF7] rounded-2xl p-5 border border-[#F5F0E6] space-y-4">
                <h3 className="font-bold text-slate-700 text-sm border-b border-[#F5F0E6] pb-2">Thông tin hôm nay</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Trạng thái:</p>
                    <p className="font-bold text-slate-800 text-base mt-0.5">
                      {hasParentCheckedInToday ? (
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> Đã gửi tín hiệu an tâm
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" /> Chưa bấm nút hôm nay
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 font-medium">Cập nhật gần nhất:</p>
                    <p className="font-bold text-slate-800 text-base mt-0.5">
                      {getFormattedCheckInTime(latestParentCheckIn)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 font-medium">Tâm trạng ghi nhận:</p>
                    <p className="font-bold text-slate-800 text-base flex items-center gap-2 mt-0.5">
                      <span className="text-xl">{activeParentMoodInfo.emoji}</span>
                      <span>{activeParentMoodInfo.label}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MUTUAL 2-WAY CHECK-IN BANNER (Care Circle) */}
            <div className="bg-white border border-[#E5DACD] rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FDF6E3] flex items-center justify-center text-[#D97757]">
                    <Heart className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Gửi an tâm cho bố mẹ
                    </h3>
                  </div>
                </div>

                {/* Child Quick Check-in Action */}
                <div className="shrink-0 flex flex-col items-end gap-2 w-full sm:w-auto">
                  {hasChildCheckedInToday ? (
                    <div className="p-3 w-full sm:w-auto rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <span className="text-sm font-bold block">Đã báo: "Con ổn"</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <button
                        onClick={() => handleChildCheckIn()}
                        disabled={isChildCheckingIn}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[#D97757] hover:bg-[#C26243] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                      >
                        <span>{isChildCheckingIn ? "..." : "TÔI ỔN"}</span>
                      </button>
                      <button
                        onClick={() => setShowChildNoteInput(!showChildNoteInput)}
                        className="px-4 py-3 rounded-xl bg-slate-50 border border-[#E5DACD] text-slate-700 hover:bg-slate-100 text-sm font-semibold"
                      >
                        Ghi chú
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable note input if child wants to write custom note */}
              {showChildNoteInput && !hasChildCheckedInToday && (
                <div className="mt-4 pt-4 border-t border-[#F5F0E6] space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={childCustomNote}
                      onChange={(e) => setChildCustomNote(e.target.value)}
                      placeholder="Ví dụ: Con vừa đến cơ quan an toàn..."
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757] bg-white"
                    />
                    <button
                      onClick={() => handleChildCheckIn()}
                      disabled={isChildCheckingIn}
                      className="px-4 py-3 rounded-xl bg-[#D97757] hover:bg-[#C26243] text-white font-bold text-sm flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Gửi</span>
                    </button>
                  </div>

                  {/* Quick mood selector for child */}
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                    <span className="text-xs text-slate-500 font-medium shrink-0">Tâm trạng:</span>
                    {childMoodOptions.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => handleSelectChildMood(opt.type, opt.label)}
                        className={`px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 shrink-0 transition-colors border ${
                          myMood?.mood === opt.type
                            ? "bg-[#FDF6E3] border-[#D97757] font-bold text-[#A64B29]"
                            : "bg-white border-[#E5DACD] text-slate-600 hover:bg-[#FAFAF8]"
                        }`}
                      >
                        <span className="text-base">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Summary Card */}
            {weeklySummaryText && (
              <div className="bg-[#FDF6E3] border border-[#E5DACD] rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#A64B29]">
                  <Activity className="w-4 h-4 text-[#D97757]" />
                  <span>Tổng kết tuần</span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-normal">
                  "{weeklySummaryText}"
                </p>
              </div>
            )}

            {/* GEMINI AI FAMILY PATTERN CARD */}
            <AiInsightCard
              insight={aiInsight}
              parentName={parentName}
              relationship={parentRelationship}
              isLoading={isAiLoading}
              onRefresh={handleRunAiAnalysis}
              onOpenCalendarSync={(title) => {
                setCalendarActionTitle(title || `Gọi hỏi thăm ${parentName}`);
                setShowCalendarModal(true);
              }}
              onCallParent={handleCallParent}
            />

          </div>
        )}

        {/* TAB 2: FAMILY CHAT (TEXT & VOICE) */}
        {activeTab === "chat" && (
          <FamilyChatView
            parentName={parentName}
            isParentView={false}
          />
        )}

        {/* TAB 3: HISTORY & CALENDAR GRID */}
        {activeTab === "history" && (
          <CheckInHistoryView checkIns={parentCheckIns} moods={parentMoods} parentName={parentName} />
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-50 shadow-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${
            activeTab === "overview" ? "text-[#D97757]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Heart className={`w-6 h-6 ${activeTab === "overview" ? "fill-[#D97757]" : ""}`} />
          <span className="text-[10px] font-bold">Trang chủ</span>
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${
            activeTab === "chat" ? "text-[#D97757]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MessageSquare className={`w-6 h-6 ${activeTab === "chat" ? "fill-[#D97757]" : ""}`} />
          <span className="text-[10px] font-bold">Nhắn tin</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${
            activeTab === "history" ? "text-[#D97757]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Calendar className={`w-6 h-6 ${activeTab === "history" ? "fill-[#D97757]" : ""}`} />
          <span className="text-[10px] font-bold">Lịch sử</span>
        </button>
      </div>

      {showCalendarModal && (
        <CalendarDirectCreateModal
          onClose={() => setShowCalendarModal(false)}
          defaultTitle={calendarActionTitle}
        />
      )}

      {showFamilySettings && (
        <FamilySettingsModal
          family={family!}
          members={members}
          profile={profile!}
          onClose={() => setShowFamilySettings(false)}
          onRefresh={refreshProfile}
        />
      )}

      {showNearbyModal && (
        <NearbyPlacesModal
          parentLocation={parentLastLocation}
          onClose={() => setShowNearbyModal(false)}
        />
      )}
    </div>
  );
};
INNER_EOF
cp /tmp/ChildDashboard.tsx src/components/child/ChildDashboard.tsx
