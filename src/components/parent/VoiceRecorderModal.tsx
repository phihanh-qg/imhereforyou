import React, { useState, useRef, useEffect } from "react";
import { AudioRecorder, transcribeAudio, sendVoiceMessage } from "../../services/voiceService";
import { Mic, Square, Play, Pause, Send, X, AlertCircle, Sparkles, Volume2 } from "lucide-react";
import { UserRole } from "../../types";

interface VoiceRecorderModalProps {
  familyId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  familyId,
  senderId,
  senderName,
  senderRole,
  onClose,
  onSuccess,
}) => {
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "recorded" | "sending">("idle");
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    setErrorMsg(null);
    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setRecordingState("recording");
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setErrorMsg("Không thể truy cập microphone. Vui lòng cho phép quyền ghi âm trên trình duyệt.");
      setRecordingState("idle");
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!recorderRef.current) return;

    try {
      const result = await recorderRef.current.stop();
      setAudioDataUrl(result.audioDataUrl);
      setRecordDuration(result.duration || 5);
      setRecordingState("recorded");

      // Trigger automatic Speech-to-Text transcription with Gemini
      setIsTranscribing(true);
      transcribeAudio(result.audioDataUrl)
        .then((text) => {
          if (text) setTranscript(text);
        })
        .catch((e) => console.error("Transcribe failed:", e))
        .finally(() => setIsTranscribing(false));
    } catch (err: any) {
      console.error("Stop recording error:", err);
      setErrorMsg("Lỗi khi kết thúc ghi âm.");
      setRecordingState("idle");
    }
  };

  const togglePlayback = () => {
    if (!audioDataUrl) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioDataUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSendMessage = async () => {
    if (!audioDataUrl || !familyId || !senderId) return;

    setRecordingState("sending");
    try {
      await sendVoiceMessage(
        familyId,
        senderId,
        senderName,
        senderRole,
        audioDataUrl,
        recordDuration,
        transcript || undefined
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Send voice message error:", err);
      setErrorMsg("Lỗi khi gửi lời nhắn thoại.");
      setRecordingState("recorded");
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6F0EB] w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6F0EB] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Gửi lời nhắn cho con
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* State: IDLE */}
        {recordingState === "idle" && (
          <div className="py-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center mx-auto shadow-sm">
              <Mic className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-base">Ghi âm trực tiếp</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Bố mẹ có thể gửi lời nhắn thoại để con nghe lại bất cứ khi nào.
              </p>
            </div>

            <button
              onClick={handleStartRecording}
              className="w-full py-3.5 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Bắt đầu ghi âm
            </button>
          </div>
        )}

        {/* State: RECORDING */}
        {recordingState === "recording" && (
          <div className="py-4 space-y-4">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-200 animate-ping opacity-75" />
              <div className="relative w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                <Mic className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-rose-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                Đang ghi âm lời nhắn...
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900">
                {formatSeconds(recordDuration)}
              </div>
              <p className="text-xs text-slate-500">
                Hãy nói tự nhiên, con sẽ nghe lại giọng của mẹ/bố.
              </p>
            </div>

            <button
              onClick={handleStopRecording}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-white" />
              Dừng ghi âm
            </button>
          </div>
        )}

        {/* State: RECORDED & SENDING */}
        {(recordingState === "recorded" || recordingState === "sending") && (
          <div className="py-2 space-y-3.5">
            {/* Audio Preview card */}
            <div className="bg-[#F8FAF9] border border-[#E6F0EB] rounded-2xl p-3 flex items-center justify-between gap-3">
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-[#2EBD6E] text-white flex items-center justify-center shadow-xs hover:bg-[#27AE60] transition-all shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                  <Volume2 className="w-3.5 h-3.5 text-[#2EBD6E]" />
                  <span>Lời nhắn thoại ({formatSeconds(recordDuration)})</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Bấm nút play để nghe lại trước khi gửi
                </div>
              </div>
            </div>

            {/* AI Transcript */}
            <div className="bg-[#E8F8F0] border border-[#DCF5E8] rounded-2xl p-3 text-left space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2EBD6E]" />
                  <span>Chuyển thành văn bản:</span>
                </div>
                {isTranscribing && <span className="text-[11px] text-[#2EBD6E] animate-pulse">Đang nhận diện...</span>}
              </div>
              <p className="text-xs text-slate-700 italic min-h-[18px]">
                {transcript ? `"${transcript}"` : isTranscribing ? "Đang lắng nghe và phiên âm..." : "(Chưa có văn bản nhận diện)"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={recordingState === "sending"}
                className="flex-1 py-3 px-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Ghi lại
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={recordingState === "sending"}
                className="flex-1 py-3 px-3 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {recordingState === "sending" ? (
                  "Đang gửi..."
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Gửi cho con
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
