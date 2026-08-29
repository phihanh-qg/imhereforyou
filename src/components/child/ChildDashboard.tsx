import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CheckInRecord,
  MoodRecord,
  VoiceMessageRecord,
  AlertRecord,
  ActiveMeeting,
} from "../../types";
import {
  listenToRecentCheckIns,
  listenToRecentMoods,
  listenToActiveAlerts,
  recordCheckIn,
  getTodayDateStr,
} from "../../services/checkInService";
import { listenToVoiceMessages } from "../../services/voiceService";
import {
  listenToFamilyMeeting,
  startFamilyMeeting,
  getFamilyFixedMeetUrl,
  ensureOrAutoCreateFamilyFixedMeetUrl,
} from "../../services/meetingService";

import { FamilyMembersView } from "../common/FamilyMembersView";
import { NearbyPlacesModal } from "../common/NearbyPlacesModal";
import { CalendarDirectCreateModal } from "./CalendarDirectCreateModal";
import { AiAnalysisModal } from "./AiAnalysisModal";
import { EmergencyHelpModal } from "../parent/EmergencyHelpModal";
import { GoogleMeetSetupModal } from "../common/GoogleMeetSetupModal";

import { Check, Sparkles, ShieldAlert, Home, Users } from "lucide-react";

export const ChildDashboard: React.FC = () => {
  const { user, profile, family, members } = useAuth();

  const [activeTab, setActiveTab] = useState<"home" | "family">("home");

  // Check-in state
  const [hasChildCheckedInToday, setHasChildCheckedInToday] = useState(false);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);

  // Firestore records
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessageRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarActionTitle, setCalendarActionTitle] = useState("");
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMeetSetupModal, setShowMeetSetupModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const showToast = (text: string) => {
    setToastMessage(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2200);
  };

  const familyId = profile?.familyId || "";
  const parentMember = members.find((m) => m.role === "parent");
  const parentName = parentMember?.displayName || "Mẹ";

  // Real-time listeners
  useEffect(() => {
    if (!familyId || !user) return;
    const todayStr = getTodayDateStr();
    const unsubCheckIns = listenToRecentCheckIns(familyId, (records) => {
      setCheckIns(records);
      const mine = records.find(
        (r) => (r.userId === user.uid || r.parentId === user.uid) && r.dateStr === todayStr
      );
      setHasChildCheckedInToday(!!mine);
    });
    const unsubMoods = listenToRecentMoods(familyId, (r) => setMoods(r));
    const unsubVoice = listenToVoiceMessages(familyId, (m) => setVoiceMessages(m));
    const unsubAlerts = listenToActiveAlerts(familyId, (a) => setAlerts(a));
    const unsubMeet = listenToFamilyMeeting(familyId, (m) => setActiveMeeting(m));
    return () => { unsubCheckIns(); unsubMoods(); unsubVoice(); unsubAlerts(); unsubMeet(); };
  }, [familyId, user?.uid]);

  const todayFormattedDate = useMemo(() =>
    new Date().toLocaleDateString("vi-VN", { weekday: "long", month: "long", day: "numeric" }),
    []
  );

  const handleCheckIn = async () => {
    if (hasChildCheckedInToday) { showToast("Bạn đã báo bình an hôm nay rồi ✓"); return; }
    if (!user || !familyId || isCheckInLoading) return;
    setIsCheckInLoading(true);
    try {
      await recordCheckIn(
        user.uid, profile?.displayName || "Con", familyId,
        "Tôi ổn, cả nhà yên tâm nhé!", "child", profile?.relationship || "Con cái"
      );
      setHasChildCheckedInToday(true);
      showToast("Đã báo bình an đến gia đình ✓");
    } catch {
      showToast("Lỗi khi gửi – thử lại nhé");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!familyId || !user) return;
    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      showToast("Đang vào Google Meet...");
      try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, activeMeeting.meetUrl); } catch {}
      return;
    }
    let url = getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || "";
    if (!url) { try { url = await ensureOrAutoCreateFamilyFixedMeetUrl(familyId, family?.fixedMeetUrl); } catch {} }
    if (!url) { setShowMeetSetupModal(true); return; }
    showToast("Đang vào Google Meet...");
    try { await startFamilyMeeting(familyId, user.uid, profile?.displayName || "Con", "child", family?.inviteCode, url); } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── SHELL ── */}
      <div className="flex h-full w-full overflow-hidden bg-white">

        {/* ── CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── Segmented tab bar (desktop top / mobile inline) ── */}
          <div className="shrink-0 flex justify-center px-4 pt-4 pb-0">
            <div className="inline-flex bg-[#f2f3f5] rounded-[14px] p-1 gap-1">
              {([
                { id: "home" as const, label: "Trang chủ", icon: Home },
                { id: "family" as const, label: "Người thân", icon: Users },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-semibold cursor-pointer border-0 transition-all duration-150 ${
                    activeTab === id
                      ? "bg-white text-[#159447] shadow-sm"
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB 1: HOME ── */}
          {activeTab === "home" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
              <div className="w-full max-w-xs flex flex-col items-center gap-5">

                {/* Date */}
                <p className="text-xs font-medium text-[#a0a7b0] tracking-wide capitalize">
                  {todayFormattedDate}
                </p>

                {/* Headline */}
                <div className="text-center space-y-1">
                  <h1 className="text-[28px] md:text-[36px] lg:text-[42px] font-black tracking-tight text-[#17191c] leading-[1.1]">
                    Hôm nay bạn<br />vẫn ổn chứ?
                  </h1>
                  <p className="text-sm text-[#9ca3af]">
                    Chạm một lần để gia đình biết bạn bình an.
                  </p>
                </div>

                {/* Hero circle */}
                <div className="relative my-1">
                  <div className={`absolute inset-[-20px] rounded-full transition-all duration-700 ${
                    hasChildCheckedInToday
                      ? "shadow-[0_0_0_18px_rgba(21,148,71,0.07),0_0_0_36px_rgba(21,148,71,0.03)]"
                      : "shadow-[0_0_0_18px_rgba(40,180,99,0.07),0_0_0_36px_rgba(40,180,99,0.03)] animate-breathe"
                  }`} />
                  <button
                    id="childCheckBtn"
                    onClick={handleCheckIn}
                    disabled={isCheckInLoading}
                    className={`relative w-[190px] h-[190px] md:w-[230px] md:h-[230px] lg:w-[270px] lg:h-[270px] border-0 rounded-full text-white cursor-pointer select-none transition-all duration-300 flex flex-col items-center justify-center outline-none active:scale-95 disabled:opacity-75 ${
                      hasChildCheckedInToday
                        ? "bg-[#159447] shadow-[0_16px_48px_rgba(21,148,71,0.35)]"
                        : "bg-[#28b463] shadow-[0_16px_48px_rgba(40,180,99,0.3)] hover:shadow-[0_20px_64px_rgba(40,180,99,0.4)] hover:scale-[1.02]"
                    }`}
                  >
                    <svg className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m5 12 4.2 4.2L19 6.8" />
                    </svg>
                    <span className="text-[17px] md:text-[20px] lg:text-[24px] font-black tracking-tight leading-tight text-center px-4">
                      {isCheckInLoading ? "Đang gửi..." : hasChildCheckedInToday ? "Đã bình an" : "Báo bình an"}
                    </span>
                  </button>
                </div>

                {/* Status badge */}
                <div className="h-8 flex items-center">
                  {hasChildCheckedInToday ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e6f5ee] text-[#159447] text-xs font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Đã báo đến gia đình
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#b0b8c1] text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Hôm nay chưa check-in
                    </span>
                  )}
                </div>

                {/* Action row */}
                <div className="w-full grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#f0faf5] hover:bg-[#e4f7ec] border border-[#d1f0de] text-[#159447] font-semibold text-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-5 h-5" />
                    Phân tích AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#fff4f6] hover:bg-[#ffe8ec] border border-[#ffd0d8] text-[#d94b61] font-semibold text-sm transition-all cursor-pointer active:scale-95"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    Khẩn cấp SOS
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ── TAB 2: FAMILY ── */}
          {activeTab === "family" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 sm:px-4 pt-3">
              <FamilyMembersView parentName={parentName} isParentView={false} />
            </div>
          )}

        </div>
      </div>

      {/* ── TOAST ── */}
      <div className={`fixed left-1/2 bottom-8 -translate-x-1/2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-2xl text-sm font-medium pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl ${
        toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}>
        {toastMessage}
      </div>

      {/* ── MODALS (outside layout to avoid z-index collisions) ── */}
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
