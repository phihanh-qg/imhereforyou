import {
  doc,
  setDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { VoiceMessageRecord, UserRole } from "../types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms time slice
    } catch (error) {
      console.error("Microphone access error:", error);
      throw error;
    }
  }

  stop(): Promise<{ audioBlob: Blob; audioDataUrl: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error("No recording in progress"));
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Stop all audio tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const audioDataUrl = reader.result as string;
          // Approximate duration based on size or audio element
          const audio = new Audio(audioDataUrl);
          audio.onloadedmetadata = () => {
            const duration = Math.round(audio.duration || 5);
            resolve({ audioBlob, audioDataUrl, duration });
          };
          audio.onerror = () => {
            resolve({ audioBlob, audioDataUrl, duration: 5 });
          };
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// Request AI Speech-to-Text from our backend
export async function transcribeAudio(audioDataUrl: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/transcribe-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: audioDataUrl, mimeType: "audio/webm" }),
    });

    if (!res.ok) {
      return "";
    }
    const data = await res.json();
    return data.transcript || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
}

// Save Voice Message to Firestore
export async function sendVoiceMessage(
  familyId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  audioDataUrl: string,
  duration: number,
  transcript?: string
): Promise<VoiceMessageRecord> {
  try {
    const now = new Date();
    const messageId = `vm_${Date.now()}_${senderId.substring(0, 5)}`;
    const msgRef = doc(db, "voiceMessages", messageId);

    const record: VoiceMessageRecord = {
      id: messageId,
      familyId,
      senderId,
      senderName,
      senderRole,
      audioDataUrl,
      duration,
      transcript: transcript || "",
      timestamp: now.toISOString(),
      listenedBy: [senderId],
    };

    await setDoc(msgRef, record);
    return record;
  } catch (error) {
    console.error("Error saving voice message:", error);
    throw error;
  }
}

// Real-time listener for voice messages
export function listenToVoiceMessages(
  familyId: string,
  callback: (messages: VoiceMessageRecord[]) => void,
  limitCount: number = 30
) {
  const q = query(
    collection(db, "voiceMessages"),
    where("familyId", "==", familyId),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((d) => d.data() as VoiceMessageRecord);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(records);
  }, (err) => {
    console.error("Error listening to voice messages:", err);
  });
}
