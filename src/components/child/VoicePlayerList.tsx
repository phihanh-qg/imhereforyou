import React, { useState, useRef } from "react";
import { VoiceMessageRecord, UserRole } from "../../types";
import { Play, Pause, Mic, Volume2, Sparkles, Clock, Send, Square, User } from "lucide-react";
import { AudioRecorder, transcribeAudio, sendVoiceMessage } from "../../services/voiceService";

interface VoicePlayerListProps {
  messages: VoiceMessageRecord[];
  familyId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  parentName?: string;
}

export const VoicePlayerList: React.FC<VoicePlayerListProps> = ({
  messages,
  familyId,
  currentUserId,
  currentUserName,
  currentUserRole,
  parentName = "Bố/Mẹ",
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Child recorder state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSec, setRecordSec] = useState<number>(0);
  const [childAudioUrl, setChildAudioUrl] = useState<string | null>(null);
  const [childDuration, setChildDuration] = useState<number>(5);
  const [childTranscript, setChildTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const handleTogglePlay = (msg: VoiceMessageRecord) => {
    if (playingId === msg.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(msg.audioDataUrl);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(msg.id);
    }
  };

  const handleStartChildRecord = async () => {
    try {
      const rec = new AudioRecorder();
      recorderRef.current = rec;
      await rec.start();
      setIsRecording(true);
      setRecordSec(0);
      setChildAudioUrl(null);
      setChildTranscript("");

      timerRef.current = setInterval(() => {
        setRecordSec((p) => p + 1);
      }, 1000);
    } catch (e) {
      console.error("Mic error:", e);
      alert("Vui lòng cho phép quyền microphone trên trình duyệt để ghi âm.");
    }
  };

  const handleStopChildRecord = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recorderRef.current) return;

    try {
      const res = await recorderRef.current.stop();
      setIsRecording(false);
      setChildAudioUrl(res.audioDataUrl);
      setChildDuration(res.duration || 5);

      setIsTranscribing(true);
      transcribeAudio(res.audioDataUrl)
        .then((t) => {
          if (t) setChildTranscript(t);
        })
        .finally(() => setIsTranscribing(false));
    } catch (e) {
      console.error("Stop child rec error:", e);
      setIsRecording(false);
    }
  };

  const handleSendChildVoice = async () => {
    if (!childAudioUrl) return;
    setIsSending(true);
    try {
      await sendVoiceMessage(
        familyId,
        currentUserId,
        currentUserName,
        currentUserRole,
        childAudioUrl,
        childDuration,
        childTranscript
      );
      setChildAudioUrl(null);
      setChildTranscript("");
      setRecordSec(0);
    } catch (e) {
      console.error("Send error:", e);
    } finally {
      setIsSending(false);
    }
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="space-y-4">
      {/* Send Voice Reply Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Gửi lời nhắn thoại cho {parentName}
              </h4>
              <p className="text-[11px] text-slate-500">
                Bố mẹ lớn tuổi rất thích nghe giọng nói của con cháu mỗi ngày
              </p>
            </div>
          </div>
        </div>

        {isRecording ? (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-bold text-rose-800">
                Đang ghi âm ({formatSec(recordSec)})
              </span>
            </div>
            <button
              onClick={handleStopChildRecord}
              className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold text-xs flex items-center gap-1 hover:bg-rose-800 shadow-xs"
            >
              <Square className="w-3 h-3 fill-white" />
              Dừng lại
            </button>
          </div>
        ) : childAudioUrl ? (
          <div className="space-y-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">
                Đã ghi xong ({formatSec(childDuration)})
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartChildRecord}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Ghi lại
                </button>
                <button
                  onClick={handleSendChildVoice}
                  disabled={isSending}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {isSending ? "Đang gửi..." : "Gửi lời nhắn"}
                </button>
              </div>
            </div>

            {childTranscript && (
              <div className="text-xs text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200">
                "{childTranscript}"
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleStartChildRecord}
            className="w-full py-2.5 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50/50 text-indigo-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bấm vào đây để thu âm lời nhắn cho {parentName}</span>
          </button>
        )}
      </div>

      {/* Voice Messages List */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Hộp thư thoại gia đình
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{messages.length} tin nhắn</span>
        </div>

        {messages.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <p className="text-xs text-slate-500">Chưa có tin nhắn thoại nào trong gia đình.</p>
            <p className="text-[11px] text-slate-400">
              Bố mẹ có thể bấm nút "NÓI VỚI CON" trên màn hình chính để gửi tin nhắn.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg) => {
              const isPlaying = playingId === msg.id;
              const isParentMsg = msg.senderRole === "parent";
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isParentMsg
                      ? "bg-indigo-50/40 border-indigo-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => handleTogglePlay(msg)}
                        className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-all mt-0.5"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                              isParentMsg
                                ? "bg-indigo-100 text-indigo-900"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isParentMsg ? "Bố/Mẹ" : "Con"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(msg.timestamp).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                          <span>• {formatSec(msg.duration || 5)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transcript */}
                  {msg.transcript && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-xs text-slate-700">
                      <Sparkles className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed italic">"{msg.transcript}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
