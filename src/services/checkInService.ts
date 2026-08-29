import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CheckInRecord, MoodRecord, AlertRecord, MoodType } from "../types";

// Helper to get formatted date string (YYYY-MM-DD)
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check-in Operations (Mutual for any family member)
export async function recordCheckIn(
  userId: string,
  userName: string,
  familyId: string,
  note: string = "",
  role: "parent" | "child" | "trusted_contact" = "parent",
  relationship: string = ""
): Promise<CheckInRecord> {
  const now = new Date();
  const dateStr = getTodayDateStr();
  const checkInId = `chk_${userId}_${dateStr}`;
  const checkInRef = doc(db, "checkIns", checkInId);

  const record: CheckInRecord = {
    id: checkInId,
    familyId,
    userId,
    userName,
    userRole: role,
    relationship: relationship || (role === "parent" ? "Bố/Mẹ" : "Con"),
    parentId: userId, // for backward compatibility
    parentName: userName, // for backward compatibility
    status: "ok",
    note,
    timestamp: now.toISOString(),
    dateStr,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Immediate local cache
  try {
    const raw = localStorage.getItem(`checkins_${familyId}`);
    const list: CheckInRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((c) => c.id !== checkInId);
    filtered.unshift(record);
    localStorage.setItem(`checkins_${familyId}`, JSON.stringify(filtered));
  } catch {}

  try {
    setDoc(checkInRef, record).catch((e) => {
      console.warn("Firestore record check-in sync deferred:", e);
    });
  } catch (error) {
    console.warn("Firestore record check-in sync deferred (offline):", error);
  }
  return record;
}

// Mood Operations (Mutual for any family member)
export async function recordMood(
  userId: string,
  familyId: string,
  mood: MoodType,
  moodLabel: string,
  userName: string = "",
  role: "parent" | "child" | "trusted_contact" = "parent"
): Promise<MoodRecord> {
  const now = new Date();
  const dateStr = getTodayDateStr();
  const moodId = `mood_${userId}_${Date.now()}`;
  const moodRef = doc(db, "moods", moodId);

  const record: MoodRecord = {
    id: moodId,
    familyId,
    userId,
    userName,
    userRole: role,
    parentId: userId, // for backward compatibility
    mood,
    moodLabel,
    timestamp: now.toISOString(),
    dateStr,
  };

  // Immediate local cache
  try {
    const raw = localStorage.getItem(`moods_${familyId}`);
    const list: MoodRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(`moods_${familyId}`, JSON.stringify(list));
  } catch {}

  try {
    setDoc(moodRef, record).catch((e) => {
      console.warn("Firestore record mood sync deferred:", e);
    });
  } catch (error) {
    console.warn("Firestore record mood sync deferred (offline):", error);
  }
  return record;
}

// Emergency Alert Operations
export async function triggerEmergencyAlert(
  parentId: string,
  parentName: string,
  familyId: string,
  message: string,
  location?: { lat: number; lng: number; address?: string } | null
): Promise<AlertRecord> {
  const now = new Date();
  const alertId = `alt_${Date.now()}_${parentId.substring(0, 5)}`;
  const alertRef = doc(db, "alerts", alertId);

  const record: AlertRecord = {
    id: alertId,
    familyId,
    parentId,
    parentName,
    type: "help_request",
    message: message || `${parentName} đã bấm nút 'TÔI CẦN GIÚP' và cần sự hỗ trợ của người thân.`,
    location: location || null,
    status: "active",
    createdAt: now.toISOString(),
  };

  // Immediate local cache
  try {
    const raw = localStorage.getItem(`alerts_${familyId}`);
    const list: AlertRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(`alerts_${familyId}`, JSON.stringify(list));
  } catch {}

  try {
    await setDoc(alertRef, record);
  } catch (error) {
    console.warn("Firestore trigger alert sync deferred (offline):", error);
  }
  return record;
}

export async function resolveAlert(alertId: string): Promise<void> {
  try {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Firestore resolve alert error:", error);
  }
}

// Real-time Listeners
export function listenToRecentCheckIns(
  familyId: string,
  callback: (checkIns: CheckInRecord[]) => void,
  limitCount: number = 30
) {
  try {
    const raw = localStorage.getItem(`checkins_${familyId}`);
    if (raw) callback(JSON.parse(raw));
  } catch {}

  const q = query(
    collection(db, "checkIns"),
    where("familyId", "==", familyId),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((d) => d.data() as CheckInRecord);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    try {
      localStorage.setItem(`checkins_${familyId}`, JSON.stringify(records));
    } catch {}
    callback(records);
  }, (err) => {
    console.warn("Notice for check-ins listener, fallback to local cache:", err);
    try {
      const raw = localStorage.getItem(`checkins_${familyId}`);
      if (raw) callback(JSON.parse(raw));
    } catch {}
  });
}

export function listenToRecentMoods(
  familyId: string,
  callback: (moods: MoodRecord[]) => void,
  limitCount: number = 30
) {
  try {
    const raw = localStorage.getItem(`moods_${familyId}`);
    if (raw) callback(JSON.parse(raw));
  } catch {}

  const q = query(
    collection(db, "moods"),
    where("familyId", "==", familyId),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((d) => d.data() as MoodRecord);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    try {
      localStorage.setItem(`moods_${familyId}`, JSON.stringify(records));
    } catch {}
    callback(records);
  }, (err) => {
    console.warn("Notice for moods listener, fallback to local cache:", err);
    try {
      const raw = localStorage.getItem(`moods_${familyId}`);
      if (raw) callback(JSON.parse(raw));
    } catch {}
  });
}

export function listenToActiveAlerts(
  familyId: string,
  callback: (alerts: AlertRecord[]) => void
) {
  try {
    const raw = localStorage.getItem(`alerts_${familyId}`);
    if (raw) callback(JSON.parse(raw));
  } catch {}

  const q = query(
    collection(db, "alerts"),
    where("familyId", "==", familyId)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs
      .map((d) => d.data() as AlertRecord)
      .filter((a) => a.status === "active");
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    try {
      localStorage.setItem(`alerts_${familyId}`, JSON.stringify(records));
    } catch {}
    callback(records);
  }, (err) => {
    console.warn("Notice for alerts listener, fallback to local cache:", err);
    try {
      const raw = localStorage.getItem(`alerts_${familyId}`);
      if (raw) callback(JSON.parse(raw));
    } catch {}
  });
}
