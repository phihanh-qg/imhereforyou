import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ChatMessageRecord, UserRole } from "../types";

// Send a Text or Quick-Preset Message
export async function sendChatMessage(
  familyId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  text: string,
  type: "text" | "quick_preset" | "voice" = "text",
  senderAvatar?: string,
  audioDataUrl?: string,
  duration?: number,
  transcript?: string
): Promise<ChatMessageRecord> {
  const now = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${senderId.substring(0, 5)}`;
  const msgRef = doc(db, "chatMessages", messageId);

  const record: ChatMessageRecord = {
    id: messageId,
    familyId,
    senderId,
    senderName,
    senderRole,
    senderAvatar: senderAvatar || "",
    type,
    text: text || "",
    audioDataUrl: audioDataUrl || "",
    duration: duration || 0,
    transcript: transcript || "",
    timestamp: now,
    reactions: {},
  };

  // 1. Immediate Local Cache for Zero-Latency UI
  try {
    const raw = localStorage.getItem(`chat_${familyId}`);
    const list: ChatMessageRecord[] = raw ? JSON.parse(raw) : [];
    list.push(record);
    localStorage.setItem(`chat_${familyId}`, JSON.stringify(list));
  } catch {}

  // 2. Firestore Sync (non-blocking)
  setDoc(msgRef, record).catch((err) => {
    console.warn("Firestore sendChatMessage deferred:", err);
  });

  return record;
}

// Add Emoji Reaction
export async function addMessageReaction(
  messageId: string,
  familyId: string,
  emoji: string,
  userId: string
): Promise<void> {
  // Update local cache
  try {
    const raw = localStorage.getItem(`chat_${familyId}`);
    if (raw) {
      const list: ChatMessageRecord[] = JSON.parse(raw);
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        const currentUsers = msg.reactions[emoji] || [];
        if (currentUsers.includes(userId)) {
          msg.reactions[emoji] = currentUsers.filter((u) => u !== userId);
          if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
        } else {
          msg.reactions[emoji] = [...currentUsers, userId];
        }
        localStorage.setItem(`chat_${familyId}`, JSON.stringify(list));
      }
    }
  } catch {}

  // Update Firestore
  try {
    const msgRef = doc(db, "chatMessages", messageId);
    // Fetch and toggle
    onSnapshot(msgRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ChatMessageRecord;
        const reactions = data.reactions || {};
        const current = reactions[emoji] || [];
        const updated = current.includes(userId)
          ? current.filter((u) => u !== userId)
          : [...current, userId];
        
        const newReactions = { ...reactions };
        if (updated.length > 0) {
          newReactions[emoji] = updated;
        } else {
          delete newReactions[emoji];
        }

        updateDoc(msgRef, { reactions: newReactions }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn("Reaction update deferred:", err);
  }
}

// Real-time listener for Family Chat
export function listenToFamilyChat(
  familyId: string,
  callback: (messages: ChatMessageRecord[]) => void,
  limitCount: number = 60
) {
  // Return cached immediately
  try {
    const raw = localStorage.getItem(`chat_${familyId}`);
    if (raw) {
      callback(JSON.parse(raw));
    }
  } catch {}

  const q = query(
    collection(db, "chatMessages"),
    where("familyId", "==", familyId),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => d.data() as ChatMessageRecord);
      // Sort chronologically (oldest to newest)
      messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      try {
        localStorage.setItem(`chat_${familyId}`, JSON.stringify(messages));
      } catch {}
      callback(messages);
    },
    (err) => {
      console.warn("Error listening to family chat, fallback to local:", err);
      try {
        const raw = localStorage.getItem(`chat_${familyId}`);
        if (raw) callback(JSON.parse(raw));
      } catch {}
    }
  );
}
