import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { ChatMessageRecord, UserRole } from "../../types";
import {
  sendChatMessage,
  listenToFamilyChat,
  addMessageReaction,
} from "../../services/chatService";
import { AudioRecorder, transcribeAudio } from "../../services/voiceService";
import { openGoogleMeetInstant } from "../../services/googleWorkspaceService";
import {
  startFamilyMeeting,
  endFamilyMeeting,
  listenToFamilyMeeting,
  hasConfiguredMeetUrl,
  getFamilyFixedMeetUrl,
  ensureOrAutoCreateFamilyFixedMeetUrl,
} from "../../services/meetingService";
import { ActiveMeetingBanner } from "./ActiveMeetingBanner";
import { GoogleMeetSetupModal } from "./GoogleMeetSetupModal";
import { ActiveMeeting } from "../../types";
import {
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Smile,
  Heart,
  MessageSquare,
  Sparkles,
  Volume2,
  Check,
  Clock,
  Video,
  Radio,
  Settings,
  PhoneOff,
} from "lucide-react";

interface FamilyChatViewProps {
  parentName?: string;
  isParentView?: boolean;
}

export const FamilyChatView: React.FC<FamilyChatViewProps> = ({
  parentName = "Bố/Mẹ",
  isParentView = false,
}) => {
  const { user, profile, family } = useAuth();
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [showMeetSetupModal, setShowMeetSetupModal] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDataUrl, setRecordingDataUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const familyId = profile?.familyId || "";
  const currentUserId = user?.uid || "";
  const currentUserName = profile?.displayName || (isParentView ? "Bố/Mẹ" : "Con");
  const currentUserRole: UserRole = profile?.role || (isParentView ? "parent" : "child");

  // Presets tailored to role
  const parentPresets = [
    "Bố/Mẹ ăn cơm rồi nhé, con yên tâm",
    "Bố/Mẹ đã uống thuốc đúng giờ",
    "Hôm nay bố mẹ đi dạo khỏe lắm",
    "Nhớ các con nhiều lắm",
    "Rảnh thì gọi cho bố mẹ nhé",
    "Trời hôm nay đẹp, mẹ vừa tưới cây xong",
  ];

  const childPresets = [
    "Con yêu bố mẹ nhiều!",
    "Bố mẹ nhớ ăn uống đầy đủ đúng giờ nhé",
    "Bố mẹ đã uống thuốc sáng nay chưa?",
    "Con đang trên đường về nhà rồi ạ",
    "Hôm nay công việc con rất thuận lợi",
    "Tối nay rảnh con gọi video cho bố mẹ nhé!",
  ];

  const activePresets = isParentView ? parentPresets : childPresets;

  // Listen to real-time chat messages
  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = listenToFamilyChat(familyId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [familyId]);

  // Listen to real-time Active Video Meeting
  useEffect(() => {
    if (!familyId) return;
    const unsubMeet = listenToFamilyMeeting(familyId, (m) => {
      setActiveMeeting(m);
    });
    return () => unsubMeet();
  }, [familyId]);

  // Handle Join or Start Video Meeting
  const handleToggleMeeting = async () => {
    if (!familyId || !currentUserId) return;

    // If meeting is already actively open with a valid URL, join immediately
    if (activeMeeting?.isOpen && activeMeeting.meetUrl) {
      try {
        await startFamilyMeeting(
          familyId,
          currentUserId,
          currentUserName,
          currentUserRole,
          family?.inviteCode,
          activeMeeting.meetUrl
        );
      } catch (err) {
        console.error("Error joining meeting:", err);
      }
      return;
    }

    // Check if group has a configured fixed Google Meet link or auto-create one
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

    try {
      await startFamilyMeeting(
        familyId,
        currentUserId,
        currentUserName,
        currentUserRole,
        family?.inviteCode,
        targetUrl
      );
    } catch (err) {
      console.error("Error starting meeting:", err);
    }
  };

  // Send Text Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !familyId || !currentUserId || isSending) return;

    setIsSending(true);
    try {
      await sendChatMessage(
        familyId,
        currentUserId,
        currentUserName,
        currentUserRole,
        text,
        "text"
      );
      if (!textToSend) {
        setInputText("");
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Start Voice Recording
  const handleStartRecord = async () => {
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error("Record start error:", err);
    }
  };

  // Stop Recording and Send
  const handleStopAndSendVoice = async () => {
    if (!recorderRef.current) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      const { blob, dataUrl, duration } = await recorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);

      // AI Transcribe via Gemini
      let transcript = "";
      try {
        transcript = await transcribeAudio(blob);
      } catch (e) {
        console.warn("Transcript error, continuing with voice only:", e);
      }

      await sendChatMessage(
        familyId,
        currentUserId,
        currentUserName,
        currentUserRole,
        transcript ? `[Ghi âm]: "${transcript}"` : "[Tin nhắn thoại]",
        "voice",
        "",
        dataUrl,
        duration,
        transcript
      );
    } catch (err) {
      console.error("Send voice error:", err);
    } finally {
      setIsTranscribing(false);
      recorderRef.current = null;
    }
  };

  const handleCancelRecord = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current) {
      recorderRef.current.stop().catch(() => {});
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Audio Playback
  const handlePlayVoice = (msgId: string, url: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlayingMsgId(null);
      audioRef.current.play();
      setPlayingMsgId(msgId);
    }
  };

  // Add Reaction
  const handleReact = (msgId: string, emoji: string) => {
    if (!familyId || !currentUserId) return;
    addMessageReaction(msgId, familyId, emoji, currentUserId);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col flex-1 h-full min-h-0 overflow-hidden relative">
      {/* Fixed Chat Header with Title "Hộp thư gia đình" */}
      <div className="sticky top-0 z-30 shrink-0 p-3 sm:p-4 border-b border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#E8F8F0] text-[#28b463] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[#17191c] text-sm sm:text-base tracking-tight truncate">
            Hộp thư gia đình
          </h3>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAF9]/50 scrollbar-none overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Chưa có tin nhắn nào</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              Hãy gửi lời nhắn yêu thương đầu tiên hoặc chọn tin nhắn nhanh bên dưới để trò chuyện cùng gia đình nhé!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isParent = msg.senderRole === "parent";

            // Check if this is a call/meeting system announcement
            const isCallNotification = Boolean(
              msg.type === "call" ||
              (msg.text && (
                msg.text.includes("đã mở cuộc gọi") ||
                msg.text.includes("cuộc gọi thoại") ||
                msg.text.includes("cuộc gọi video") ||
                msg.text.includes("đã vào phòng gọi") ||
                msg.text.includes("Google Meet") ||
                msg.text.includes("kết thúc cuộc gọi") ||
                msg.text.includes("đã tắt phòng")
              ))
            );

            if (isCallNotification) {
              const cleanText = msg.text.replace(/^[📹📞]\s*/, "");
              const isEnded = cleanText.includes("kết thúc") || cleanText.includes("đã tắt") || cleanText.includes("đã rời");
              return (
                <div key={msg.id} className="w-full flex items-center justify-center my-2 animate-in fade-in duration-150">
                  <div
                    onClick={!isEnded ? handleToggleMeeting : undefined}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all shadow-2xs select-none ${
                      isEnded
                        ? "bg-slate-100/90 border border-slate-200/70 text-slate-500 cursor-default"
                        : "bg-[#E8F8F0] hover:bg-[#d8f5e5] border border-[#C5ECD6] text-[#159447] font-medium cursor-pointer"
                    }`}
                  >
                    <Video className={`w-3.5 h-3.5 ${isEnded ? "text-slate-400" : "text-[#159447]"} shrink-0`} />
                    <span className="font-medium">{cleanText}</span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                {/* Sender Name & Role */}
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400 font-medium">
                  <span>{isMe ? "Bạn" : msg.senderName}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isParent
                        ? "bg-[#E8F8F0] text-[#2EBD6E]"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {isParent ? "Bố/Mẹ" : "Con"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-3.5 text-sm shadow-2xs space-y-1.5 ${
                    isMe
                      ? "bg-[#2EBD6E] text-white rounded-tr-xs"
                      : "bg-white text-slate-900 border border-[#E6F0EB] rounded-tl-xs"
                  }`}
                >
                  {/* Voice Audio Message */}
                  {msg.type === "voice" && msg.audioDataUrl && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayVoice(msg.id, msg.audioDataUrl)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isMe
                              ? "bg-white text-[#2EBD6E] hover:bg-slate-100"
                              : "bg-[#2EBD6E] text-white hover:bg-[#27AE60]"
                          }`}
                        >
                          {playingMsgId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className="text-xs font-bold block">
                            Tin nhắn thoại ({msg.duration || 5}s)
                          </span>
                          <span
                            className={`text-[10px] ${
                              isMe ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {playingMsgId === msg.id ? "Đang phát..." : "Bấm để nghe"}
                          </span>
                        </div>
                      </div>

                      {msg.transcript && (
                        <p
                          className={`text-xs italic pl-1 border-l-2 ${
                            isMe
                              ? "border-emerald-300 text-emerald-50"
                              : "border-slate-300 text-slate-600"
                          }`}
                        >
                          "{msg.transcript}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Standard Text or Preset Message */}
                  {msg.type !== "voice" && (
                    <p
                      className={`leading-relaxed whitespace-pre-wrap ${
                        isParentView
                          ? "text-base sm:text-lg font-medium"
                          : "text-sm sm:text-base font-normal"
                      }`}
                    >
                      {msg.text}
                    </p>
                  )}
                </div>

                {/* Reaction Emojis list & Quick reaction bar */}
                <div className="flex items-center gap-1 px-1">
                  {/* Existing reactions */}
                  {msg.reactions &&
                    Object.entries(msg.reactions).map(([emoji, rawIds]) => {
                      const userIds = Array.isArray(rawIds) ? (rawIds as string[]) : [];
                      if (userIds.length === 0) return null;
                      const hasReacted = userIds.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 border transition-all ${
                            hasReacted
                              ? "bg-[#E8F8F0] border-[#DCF5E8] text-emerald-950 font-bold"
                              : "bg-white border-[#E6F0EB] text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{userIds.length}</span>
                        </button>
                      );
                    })}

                  {/* Quick Heart button */}
                  <button
                    onClick={() => handleReact(msg.id, "❤️")}
                    title="Thả tim yêu thương"
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleReact(msg.id, "👍")}
                    title="Đồng ý"
                    className="p-1 rounded-full text-slate-400 hover:text-[#2EBD6E] hover:bg-[#E8F8F0] text-[11px] transition-colors font-bold"
                  >
                    OK
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Presets Bar */}
      <div className="p-2.5 bg-white border-t border-[#E6F0EB] overflow-x-auto flex items-center gap-2 shrink-0 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#2EBD6E]" />
          Nhanh:
        </span>
        {activePresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(preset)}
            className="px-3 py-1.5 rounded-full bg-[#F8FAF9] hover:bg-[#E8F8F0] border border-[#E6F0EB] hover:border-[#DCF5E8] text-slate-700 hover:text-[#2EBD6E] text-xs font-medium shrink-0 transition-colors shadow-2xs"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Bottom Input Box / Voice Recorder */}
      <div className="p-3.5 bg-white border-t border-[#E6F0EB] space-y-2">
        {isRecording ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-200 animate-pulse">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>Đang thu âm: {recordSeconds}s</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelRecord}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleStopAndSendVoice}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </button>
            </div>
          </div>
        ) : isTranscribing ? (
          <div className="p-3 text-center text-xs font-bold text-[#2EBD6E] bg-[#E8F8F0] rounded-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI đang chuyển lời thoại thành chữ &amp; gửi tin nhắn...</span>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isParentView
                  ? "Nhập tin nhắn cho con tại đây..."
                  : `Nhắn tin cho ${parentName} hoặc cả nhà...`
              }
              className={`flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2EBD6E] focus:border-transparent ${
                isParentView ? "text-base" : "text-sm"
              }`}
            />

            {/* Mic button */}
            <button
              type="button"
              onClick={handleStartRecord}
              title="Nhấn để ghi âm gửi tin nhắn thoại"
              className="p-3 rounded-2xl bg-[#F8FAF9] hover:bg-[#E8F8F0] text-slate-700 hover:text-[#2EBD6E] border border-[#E6F0EB] transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-5 py-3 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-sm flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
        )}
      </div>

      {showMeetSetupModal && (
        <GoogleMeetSetupModal
          familyId={familyId}
          currentMeetUrl={getFamilyFixedMeetUrl(familyId, family?.inviteCode, family?.fixedMeetUrl) || ""}
          onClose={() => setShowMeetSetupModal(false)}
          onSavedAndJoin={async (savedUrl) => {
            setShowMeetSetupModal(false);
            if (familyId && currentUserId) {
              await startFamilyMeeting(
                familyId,
                currentUserId,
                currentUserName,
                currentUserRole,
                family?.inviteCode,
                savedUrl
              );
            }
          }}
        />
      )}
    </div>
  );
};
