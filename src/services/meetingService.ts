import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ActiveMeeting, MeetingParticipant, UserRole } from "../types";
import { sendChatMessage } from "./chatService";
import { createDirectCalendarEvent } from "./googleWorkspaceService";

/**
 * Normalizes any Google Meet URL or code into https://meet.google.com/xxx-yyyy-zzz
 */
export function normalizeGoogleMeetUrl(urlOrCode: string): string | null {
  if (!urlOrCode || typeof urlOrCode !== "string") return null;
  const trimmed = urlOrCode.trim();
  if (!trimmed) return null;

  // Extract from full URL
  if (trimmed.includes("meet.google.com/")) {
    const afterDomain = trimmed.split("meet.google.com/")[1] || "";
    const cleanCode = afterDomain.split("?")[0].split("#")[0].split("/")[0].trim().toLowerCase();
    if (cleanCode.length >= 3) {
      return `https://meet.google.com/${cleanCode}`;
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const pathname = url.pathname.replace(/^\//, "").split("/")[0].toLowerCase();
      if (pathname.length >= 3) {
        return `https://meet.google.com/${pathname}`;
      }
    } catch {}
  }

  // If user pasted a code directly (e.g. xxx-yyyy-zzz or abcdefghij)
  const lettersAndDashes = trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (lettersAndDashes.length >= 3) {
    return `https://meet.google.com/${lettersAndDashes}`;
  }

  return null;
}

/**
 * Checks if a real custom fixed Meet URL is configured for the family
 */
export function hasConfiguredMeetUrl(familyId: string, customFixedUrl?: string): boolean {
  if (customFixedUrl && customFixedUrl.trim().length > 0 && normalizeGoogleMeetUrl(customFixedUrl)) {
    return true;
  }
  if (!familyId) return false;
  try {
    const cached = localStorage.getItem(`fixed_meet_${familyId}`);
    return Boolean(cached && cached.trim().length > 0 && normalizeGoogleMeetUrl(cached));
  } catch {
    return false;
  }
}

/**
 * Get the permanent fixed Google Meet URL for a family
 */
export function getFamilyFixedMeetUrl(
  familyId: string,
  inviteCode?: string,
  customFixedUrl?: string
): string | null {
  if (customFixedUrl && customFixedUrl.trim().length > 0) {
    const norm = normalizeGoogleMeetUrl(customFixedUrl);
    if (norm) return norm;
  }

  if (familyId) {
    try {
      const cached = localStorage.getItem(`fixed_meet_${familyId}`);
      if (cached && cached.trim().length > 0) {
        const norm = normalizeGoogleMeetUrl(cached);
        if (norm) return norm;
      }
    } catch {}
  }

  return null;
}

/**
 * Save and update a custom permanent Google Meet URL for a family into Firestore & LocalStorage
 */
export async function updateFamilyFixedMeetUrl(familyId: string, newUrlOrCode: string): Promise<string> {
  const normalized = normalizeGoogleMeetUrl(newUrlOrCode);
  if (!normalized) {
    throw new Error("Link không hợp lệ");
  }

  try {
    localStorage.setItem(`fixed_meet_${familyId}`, normalized);
  } catch {}

  try {
    const famDocRef = doc(db, "families", familyId);
    await setDoc(famDocRef, { fixedMeetUrl: normalized }, { merge: true });

    const meetDocRef = doc(db, "familyMeetings", familyId);
    await setDoc(meetDocRef, { meetUrl: normalized, fixedMeetUrl: normalized }, { merge: true });
  } catch (err) {
    console.warn("Error updating family fixed Meet URL:", err);
  }

  return normalized;
}

/**
 * Ensures a genuine, permanent fixed Google Meet URL exists.
 * If not already saved in Firestore/localStorage, automatically provisions a real Google Meet room
 * via Google Calendar API with 1-click and permanently stores it in Firestore.
 */
export async function ensureOrAutoCreateFamilyFixedMeetUrl(
  familyId: string,
  customFixedUrl?: string
): Promise<string> {
  // 1. Check existing URL
  const existing = getFamilyFixedMeetUrl(familyId, undefined, customFixedUrl);
  if (existing) {
    return existing;
  }

  // Check Firestore first
  try {
    const famDocRef = doc(db, "families", familyId);
    const snap = await getDoc(famDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.fixedMeetUrl && normalizeGoogleMeetUrl(data.fixedMeetUrl)) {
        const norm = normalizeGoogleMeetUrl(data.fixedMeetUrl)!;
        localStorage.setItem(`fixed_meet_${familyId}`, norm);
        return norm;
      }
    }
  } catch {}

  // 2. Automatically create genuine Google Meet room via Google Calendar API
  try {
    const eventResult = await createDirectCalendarEvent({
      title: "Phòng Họp Video Gia Đình (Google Meet)",
      description: "Phòng gọi video Google Meet chính thức cố định của gia đình.",
      startTime: new Date(),
      durationMinutes: 60,
      createMeetLink: true,
      recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA"],
    });

    if (eventResult.meetLink) {
      const normalized = normalizeGoogleMeetUrl(eventResult.meetLink);
      if (normalized) {
        await updateFamilyFixedMeetUrl(familyId, normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn("Auto Google Calendar Meet creation:", err);
  }

  return "";
}

/**
 * Start or Join the permanent family Google Meet video room.
 * Adds current user to participants list and opens the meet link.
 */
export async function startFamilyMeeting(
  familyId: string,
  createdById: string,
  createdByName: string,
  createdByRole: UserRole,
  inviteCode?: string,
  customMeetUrl?: string
): Promise<ActiveMeeting> {
  let fixedUrl = getFamilyFixedMeetUrl(familyId, inviteCode, customMeetUrl) || customMeetUrl || "";

  // If not yet available, try auto-creating
  if (!fixedUrl) {
    try {
      fixedUrl = await ensureOrAutoCreateFamilyFixedMeetUrl(familyId, customMeetUrl);
    } catch {}
  }

  const now = new Date().toISOString();

  // Load existing participants
  let existingParticipants: MeetingParticipant[] = [];
  try {
    const meetDocRef = doc(db, "familyMeetings", familyId);
    const snap = await getDoc(meetDocRef);
    if (snap.exists()) {
      const data = snap.data() as ActiveMeeting;
      if (Array.isArray(data.participants)) {
        existingParticipants = data.participants.filter((p) => p.userId !== createdById);
      }
      if (!fixedUrl && data.fixedMeetUrl) {
        fixedUrl = data.fixedMeetUrl;
      }
    }
  } catch {}

  const currentParticipant: MeetingParticipant = {
    userId: createdById,
    displayName: createdByName,
    role: createdByRole,
    joinedAt: now,
    lastSeenAt: now,
  };

  const updatedParticipants = [...existingParticipants, currentParticipant];

  const meeting: ActiveMeeting = {
    isOpen: true,
    meetingId: `meet_${familyId}`,
    meetUrl: fixedUrl,
    fixedMeetUrl: fixedUrl,
    createdById,
    createdByName,
    createdByRole,
    startedAt: now,
    participants: updatedParticipants,
    title: "Phòng gọi video Google Meet gia đình",
  };

  // 1. Cache locally
  try {
    localStorage.setItem(`active_meet_${familyId}`, JSON.stringify(meeting));
    if (fixedUrl) {
      localStorage.setItem(`fixed_meet_${familyId}`, fixedUrl);
    }
  } catch {}

  // 2. Persist to Firestore
  try {
    const meetDocRef = doc(db, "familyMeetings", familyId);
    await setDoc(meetDocRef, meeting, { merge: true });

    const famDocRef = doc(db, "families", familyId);
    setDoc(famDocRef, { activeMeeting: meeting, fixedMeetUrl: fixedUrl }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn("Error starting family meeting in Firestore:", err);
  }

  // 3. Broadcast to family chat
  try {
    await sendChatMessage(
      familyId,
      createdById,
      createdByName,
      createdByRole,
      `${createdByName} đã vào phòng gọi Google Meet`,
      "text"
    );
  } catch (err) {
    console.warn("Failed to broadcast meet announcement to chat:", err);
  }

  // 4. Open Google Meet window
  if (fixedUrl) {
    window.open(fixedUrl, "_blank", "noopener,noreferrer");
  }

  return meeting;
}

/**
 * Leave an active family Google Meet room.
 * If no participants left, automatically resets meeting to closed (initial state).
 */
export async function leaveFamilyMeeting(
  familyId: string,
  userId: string,
  userName?: string
): Promise<void> {
  if (!familyId || !userId) return;

  const currentFixed = getFamilyFixedMeetUrl(familyId) || "";
  try {
    const meetDocRef = doc(db, "familyMeetings", familyId);
    const snap = await getDoc(meetDocRef);
    if (snap.exists()) {
      const data = snap.data() as ActiveMeeting;
      const currentList = Array.isArray(data.participants) ? data.participants : [];
      const remaining = currentList.filter((p) => p.userId !== userId);

      const isStillOpen = remaining.length > 0;
      const updatedMeeting: ActiveMeeting = {
        isOpen: isStillOpen,
        meetUrl: data.meetUrl || currentFixed,
        fixedMeetUrl: data.fixedMeetUrl || currentFixed,
        meetingId: `meet_${familyId}`,
        createdById: isStillOpen ? remaining[0].userId : "",
        createdByName: isStillOpen ? remaining[0].displayName : "",
        createdByRole: isStillOpen ? remaining[0].role : ("child" as UserRole),
        startedAt: isStillOpen ? data.startedAt : "",
        participants: remaining,
      };

      try {
        localStorage.setItem(`active_meet_${familyId}`, JSON.stringify(updatedMeeting));
      } catch {}

      await setDoc(meetDocRef, updatedMeeting, { merge: true });

      const famDocRef = doc(db, "families", familyId);
      setDoc(famDocRef, { activeMeeting: isStillOpen ? updatedMeeting : null }, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn("Error leaving family meeting:", err);
  }
}

/**
 * End / Close an active family video room completely (resets to initial state)
 */
export async function endFamilyMeeting(familyId: string): Promise<void> {
  const currentFixed = getFamilyFixedMeetUrl(familyId) || "";
  const closedMeeting: ActiveMeeting = {
    isOpen: false,
    meetUrl: currentFixed,
    fixedMeetUrl: currentFixed,
    meetingId: `meet_${familyId}`,
    createdById: "",
    createdByName: "",
    createdByRole: "child" as UserRole,
    startedAt: "",
    participants: [],
  };

  try {
    localStorage.setItem(`active_meet_${familyId}`, JSON.stringify(closedMeeting));
  } catch {}

  try {
    const meetDocRef = doc(db, "familyMeetings", familyId);
    await setDoc(meetDocRef, closedMeeting, { merge: true });

    const famDocRef = doc(db, "families", familyId);
    setDoc(famDocRef, { activeMeeting: null }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn("Error ending family meeting:", err);
  }
}

/**
 * Listen in real-time to active family video meeting
 */
export function listenToFamilyMeeting(
  familyId: string,
  callback: (meeting: ActiveMeeting | null) => void
): () => void {
  if (!familyId) {
    callback(null);
    return () => {};
  }

  // Local fallback
  try {
    const cached = localStorage.getItem(`active_meet_${familyId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as ActiveMeeting;
      callback(parsed);
    }
  } catch {}

  const meetDocRef = doc(db, "familyMeetings", familyId);

  const unsubscribe = onSnapshot(
    meetDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ActiveMeeting;
        const participants = Array.isArray(data.participants) ? data.participants : [];

        // If meeting is open but has 0 participants or is older than 2 hours, it is NOT active
        let isStale = false;
        if (data.startedAt) {
          const startedTime = new Date(data.startedAt).getTime();
          if (!isNaN(startedTime) && Date.now() - startedTime > 2 * 60 * 60 * 1000) {
            isStale = true;
          }
        }

        const hasValidParticipants = participants.length > 0 && !isStale;
        const normalizedMeeting: ActiveMeeting = {
          ...data,
          isOpen: Boolean(data.isOpen && hasValidParticipants),
          participants: isStale ? [] : participants,
        };

        if (isStale && data.isOpen) {
          // Auto-clean stale meeting in Firestore
          endFamilyMeeting(familyId).catch(() => {});
        }

        try {
          localStorage.setItem(`active_meet_${familyId}`, JSON.stringify(normalizedMeeting));
          if (data.fixedMeetUrl) {
            localStorage.setItem(`fixed_meet_${familyId}`, data.fixedMeetUrl);
          }
        } catch {}

        callback(normalizedMeeting);
      } else {
        const currentFixed = getFamilyFixedMeetUrl(familyId) || "";
        callback({
          isOpen: false,
          meetingId: `meet_${familyId}`,
          meetUrl: currentFixed,
          fixedMeetUrl: currentFixed,
          createdById: "",
          createdByName: "",
          createdByRole: "child",
          startedAt: "",
          participants: [],
        });
      }
    },
    (err) => {
      console.warn("Meeting snapshot error (using fallback):", err.message || err);
      const currentFixed = getFamilyFixedMeetUrl(familyId) || "";
      callback({
        isOpen: false,
        meetingId: `meet_${familyId}`,
        meetUrl: currentFixed,
        fixedMeetUrl: currentFixed,
        createdById: "",
        createdByName: "",
        createdByRole: "child",
        startedAt: "",
        participants: [],
      });
    }
  );

  return unsubscribe;
}
