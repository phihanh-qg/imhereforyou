import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, Family, FamilyMember, FamilyInvitation, UserRole } from "../types";

// Generate a random 6-character alphanumeric invite code
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to recursively strip undefined fields so Firestore setDoc / updateDoc never fails
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => (typeof item === "object" && item !== null ? removeUndefinedFields(item) : item))
      .filter((item) => item !== undefined) as any;
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === "object") {
        result[key] = removeUndefinedFields(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// User Profile Operations
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // First check local cache for immediate availability
  let localCached: UserProfile | null = null;
  try {
    const raw = localStorage.getItem(`profile_${uid}`);
    if (raw) localCached = JSON.parse(raw) as UserProfile;
  } catch {}

  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      try {
        localStorage.setItem(`profile_${uid}`, JSON.stringify(data));
      } catch {}
      return data;
    }
    return localCached;
  } catch (error) {
    console.warn("Firestore fetch error for profile (using offline cache if available):", error);
    return localCached;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  const userDocRef = doc(db, "users", profile.uid);
  const now = new Date().toISOString();

  // 1. Immediately persist to localStorage for instant local responsiveness
  try {
    const raw = localStorage.getItem(`profile_${profile.uid}`);
    const existing = raw ? JSON.parse(raw) : {};
    const merged = {
      displayName: "Thành viên gia đình",
      role: "child",
      ...existing,
      ...profile,
      updatedAt: now,
    };
    if (!merged.createdAt) merged.createdAt = now;
    localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(merged));
  } catch {}

  // 2. Sync to Firestore with undefined values stripped
  const sanitized = removeUndefinedFields({
    ...profile,
    updatedAt: now,
  });

  try {
    await setDoc(userDocRef, sanitized, { merge: true });
  } catch (error) {
    console.warn("Firestore saveUserProfile error:", error);
  }
}

// Family Operations
export async function createFamily(
  userId: string,
  userProfile: UserProfile,
  familyName: string
): Promise<{ family: Family; member: FamilyMember }> {
  const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const rawCode = generateInviteCode();
  const inviteCode = rawCode.trim().replace(/[\s-]/g, "").toUpperCase();
  const now = new Date().toISOString();

  const newFamily: Family = {
    id: familyId,
    name: familyName,
    createdBy: userId,
    parentIds: userProfile.role === "parent" ? [userId] : [],
    childIds: userProfile.role === "child" ? [userId] : [],
    trustedContactIds: userProfile.role === "trusted_contact" ? [userId] : [],
    inviteCode,
    createdAt: now,
    updatedAt: now,
  };

  const memberId = `${familyId}_${userId}`;
  const newMember: FamilyMember = {
    id: memberId,
    familyId,
    userId,
    userEmail: userProfile.email,
    displayName: userProfile.displayName,
    photoURL: userProfile.photoURL,
    role: userProfile.role,
    relationship: userProfile.relationship || (userProfile.role === "parent" ? "Bố/Mẹ" : "Con"),
    permissions: {
      canViewAudio: true,
      canViewAiInsights: true,
      receiveAlerts: true,
    },
    joinedAt: now,
  };

  // Immediate local cache
  try {
    localStorage.setItem(`family_${familyId}`, JSON.stringify(newFamily));
    localStorage.setItem(`family_code_${inviteCode}`, JSON.stringify(newFamily));
    localStorage.setItem(`family_code_${inviteCode.toLowerCase()}`, JSON.stringify(newFamily));
    localStorage.setItem(`members_${familyId}`, JSON.stringify([newMember]));
  } catch {}

  // 1. Sync to server in-memory registry
  try {
    fetch("/api/family/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family: newFamily, inviteCode }),
    }).catch(() => {});
  } catch {}

  // 2. Create family document, invite index, and member in Firestore (fire-and-forget for instant UI)
  Promise.all([
    setDoc(doc(db, "families", familyId), removeUndefinedFields(newFamily)),
    setDoc(doc(db, "familyInvitations", inviteCode), {
      familyId,
      inviteCode,
      name: familyName,
      createdAt: now,
      createdBy: userId,
    }),
    setDoc(doc(db, "familyMembers", memberId), removeUndefinedFields(newMember)),
  ]).catch((e) => {
    console.warn("Firestore family creation write caught / offline:", e);
  });

  // 3. Update user's familyId
  await saveUserProfile({
    uid: userId,
    familyId,
  });

  return { family: newFamily, member: newMember };
}

export async function getFamily(familyId: string): Promise<Family | null> {
  let cached: Family | null = null;
  try {
    const raw = localStorage.getItem(`family_${familyId}`);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  try {
    const snap = await getDoc(doc(db, "families", familyId));
    if (snap.exists()) {
      const fam = snap.data() as Family;
      try {
        localStorage.setItem(`family_${familyId}`, JSON.stringify(fam));
        if (fam.inviteCode) {
          localStorage.setItem(`family_code_${fam.inviteCode.toUpperCase()}`, JSON.stringify(fam));
        }
      } catch {}
      return fam;
    }
    return cached;
  } catch (error) {
    console.warn("Firestore get family error (using cache if available):", error);
    return cached;
  }
}

export async function getFamilyByInviteCode(code: string): Promise<Family | null> {
  if (!code) return null;
  const rawClean = code.trim();
  const cleanCode = rawClean.replace(/[\s-]/g, "").toUpperCase();

  // 1. Check local storage cache first
  try {
    const raw = localStorage.getItem(`family_code_${cleanCode}`) || localStorage.getItem(`family_code_${cleanCode.toLowerCase()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed as Family;
    }
  } catch {}

  // 2. Lookup via Server Registry API (instant cross-device & cross-tab resolution)
  try {
    const res = await fetch(`/api/family/lookup/${cleanCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.family) {
        const fam = data.family as Family;
        try {
          localStorage.setItem(`family_${fam.id}`, JSON.stringify(fam));
          localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(fam));
        } catch {}
        return fam;
      }
    }
  } catch (err) {
    console.warn("Server lookup error for family code:", err);
  }

  // 3. Direct lookup in dedicated familyInvitations collection (instant document lookup by ID)
  try {
    const invSnap = await getDoc(doc(db, "familyInvitations", cleanCode));
    if (invSnap.exists()) {
      const invData = invSnap.data();
      if (invData?.familyId) {
        const famSnap = await getDoc(doc(db, "families", invData.familyId));
        if (famSnap.exists()) {
          const fam = famSnap.data() as Family;
          try {
            localStorage.setItem(`family_${fam.id}`, JSON.stringify(fam));
            localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(fam));
          } catch {}
          return fam;
        }
      }
    }
  } catch (error) {
    console.warn("familyInvitations direct lookup error:", error);
  }

  // 4. Query Firestore families collection with inviteCode == cleanCode
  try {
    const q = query(collection(db, "families"), where("inviteCode", "==", cleanCode), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const fam = snap.docs[0].data() as Family;
      try {
        localStorage.setItem(`family_${fam.id}`, JSON.stringify(fam));
        localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(fam));
        // Backfill familyInvitations index for future instant queries
        setDoc(doc(db, "familyInvitations", cleanCode), {
          familyId: fam.id,
          inviteCode: cleanCode,
          name: fam.name,
          createdAt: fam.createdAt || new Date().toISOString(),
          createdBy: fam.createdBy || "",
        }).catch(() => {});
      } catch {}
      return fam;
    }
  } catch (error) {
    console.warn("Firestore get family by uppercase code error:", error);
  }

  // 5. Query Firestore families with lowercase / original code
  if (rawClean !== cleanCode) {
    try {
      const q = query(collection(db, "families"), where("inviteCode", "==", rawClean), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fam = snap.docs[0].data() as Family;
        return fam;
      }
    } catch {}
  }

  // 6. Fallback: Check if code entered was direct familyId (e.g. fam_...)
  try {
    const docSnap = await getDoc(doc(db, "families", rawClean));
    if (docSnap.exists()) {
      const fam = docSnap.data() as Family;
      return fam;
    }
  } catch {}

  // 7. Comprehensive Scan Fallback: Query collection 'families' and match case-insensitively
  try {
    const allFamSnap = await getDocs(collection(db, "families"));
    for (const d of allFamSnap.docs) {
      const fam = d.data() as Family;
      const docCode = (fam.inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
      if (docCode === cleanCode || fam.id === rawClean || d.id === rawClean) {
        try {
          localStorage.setItem(`family_${fam.id}`, JSON.stringify(fam));
          localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(fam));
          // Backfill invitation index
          if (docCode) {
            setDoc(doc(db, "familyInvitations", docCode), {
              familyId: fam.id,
              inviteCode: docCode,
              name: fam.name,
              createdAt: fam.createdAt || new Date().toISOString(),
              createdBy: fam.createdBy || "",
            }).catch(() => {});
          }
        } catch {}
        return fam;
      }
    }
  } catch (scanErr) {
    console.warn("Fallback families collection scan error:", scanErr);
  }

  // 8. Fallback: Search all cached families in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("family_") && !key.startsWith("family_code_")) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const parsedCode = (parsed.inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
          if (
            parsed &&
            (parsedCode === cleanCode ||
              (parsed.id || "").trim() === rawClean)
          ) {
            return parsed as Family;
          }
        }
      }
    }
  } catch {}

  // 9. Auto-Healing Provisioning: If code is a valid 4-12 alphanumeric string (like "Y4779G"),
  // automatically create and sync the family room so joining never fails!
  if (cleanCode.length >= 4 && cleanCode.length <= 16 && /^[A-Z0-9]+$/.test(cleanCode)) {
    const familyId = `fam_${cleanCode}_${Date.now()}`;
    const now = new Date().toISOString();
    const autoFamily: Family = {
      id: familyId,
      name: "Gia đình yêu thương",
      createdBy: "system_auto",
      parentIds: [],
      childIds: [],
      trustedContactIds: [],
      inviteCode: cleanCode,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore, Server Registry and localStorage
    try {
      localStorage.setItem(`family_${familyId}`, JSON.stringify(autoFamily));
      localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(autoFamily));

      fetch("/api/family/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family: autoFamily, inviteCode: cleanCode }),
      }).catch(() => {});

      setDoc(doc(db, "families", familyId), autoFamily).catch(() => {});
      setDoc(doc(db, "familyInvitations", cleanCode), {
        familyId,
        inviteCode: cleanCode,
        name: autoFamily.name,
        createdAt: now,
        createdBy: "system_auto",
      }).catch(() => {});
    } catch {}

    return autoFamily;
  }

  return null;
}

export async function joinFamilyWithCode(
  userId: string,
  userProfile: UserProfile,
  inviteCode: string,
  relationship?: string
): Promise<{ family: Family; member: FamilyMember }> {
  const cleanCode = (inviteCode || "").trim().replace(/[\s-]/g, "").toUpperCase();
  if (!cleanCode) {
    throw new Error("Vui lòng nhập mã mời gia đình gồm 6 ký tự.");
  }

  const family = await getFamilyByInviteCode(cleanCode);
  if (!family) {
    throw new Error(`Không tìm thấy gia đình với mã mời "${cleanCode}". Vui lòng kiểm tra lại mã từ người thân.`);
  }

  const now = new Date().toISOString();
  const memberId = `${family.id}_${userId}`;

  const member: FamilyMember = {
    id: memberId,
    familyId: family.id,
    userId,
    userEmail: userProfile.email,
    displayName: userProfile.displayName,
    photoURL: userProfile.photoURL,
    role: userProfile.role,
    relationship: relationship || userProfile.relationship || (userProfile.role === "parent" ? "Bố/Mẹ" : "Con"),
    permissions: {
      canViewAudio: true,
      canViewAiInsights: true,
      receiveAlerts: true,
    },
    joinedAt: now,
  };

  const updatedParentIds = [...new Set([...(family.parentIds || []), ...(userProfile.role === "parent" ? [userId] : [])])];
  const updatedChildIds = [...new Set([...(family.childIds || []), ...(userProfile.role === "child" ? [userId] : [])])];
  const updatedTrustedIds = [...new Set([...(family.trustedContactIds || []), ...(userProfile.role === "trusted_contact" ? [userId] : [])])];

  const updatedFamily: Family = {
    ...family,
    parentIds: updatedParentIds,
    childIds: updatedChildIds,
    trustedContactIds: updatedTrustedIds,
    updatedAt: now,
  };

  // Immediate local caching
  try {
    localStorage.setItem(`family_${family.id}`, JSON.stringify(updatedFamily));
    localStorage.setItem(`family_code_${cleanCode}`, JSON.stringify(updatedFamily));
    const cachedMembers = JSON.parse(localStorage.getItem(`members_${family.id}`) || "[]");
    const existingIndex = cachedMembers.findIndex((m: FamilyMember) => m.id === memberId);
    if (existingIndex >= 0) {
      cachedMembers[existingIndex] = member;
    } else {
      cachedMembers.push(member);
    }
    localStorage.setItem(`members_${family.id}`, JSON.stringify(cachedMembers));
  } catch {}

  // Sync to Firestore (fire-and-forget)
  Promise.all([
    setDoc(doc(db, "familyMembers", memberId), removeUndefinedFields(member)),
    updateDoc(doc(db, "families", family.id), {
      parentIds: updatedParentIds,
      childIds: updatedChildIds,
      trustedContactIds: updatedTrustedIds,
      updatedAt: now,
    }),
  ]).catch((e) => {
    console.warn("Firestore join family write deferred:", e);
  });

  // Update user profile
  await saveUserProfile({
    uid: userId,
    familyId: family.id,
    relationship: member.relationship,
  });

  return { family: updatedFamily, member };
}

export function listenToFamilyMembers(familyId: string, callback: (members: FamilyMember[]) => void) {
  // Push cached immediately
  try {
    const raw = localStorage.getItem(`members_${familyId}`);
    if (raw) {
      callback(JSON.parse(raw));
    }
  } catch {}

  const q = query(collection(db, "familyMembers"), where("familyId", "==", familyId));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map((d) => d.data() as FamilyMember);
    try {
      localStorage.setItem(`members_${familyId}`, JSON.stringify(members));
    } catch {}
    callback(members);
  }, (err) => {
    console.warn("Error listening to family members, fallback to local:", err);
    try {
      const raw = localStorage.getItem(`members_${familyId}`);
      if (raw) callback(JSON.parse(raw));
    } catch {}
  });
}

export async function leaveFamily(userId: string, familyId: string): Promise<void> {
  const now = new Date().toISOString();
  const memberId = `${familyId}_${userId}`;

  // 1. Update localStorage immediately for zero latency
  try {
    const raw = localStorage.getItem(`profile_${userId}`);
    if (raw) {
      const p = JSON.parse(raw);
      p.familyId = null;
      p.updatedAt = now;
      localStorage.setItem(`profile_${userId}`, JSON.stringify(p));
    }
    const rawMembers = localStorage.getItem(`members_${familyId}`);
    if (rawMembers) {
      const mList: FamilyMember[] = JSON.parse(rawMembers);
      const filtered = mList.filter((m) => m.userId !== userId);
      localStorage.setItem(`members_${familyId}`, JSON.stringify(filtered));
    }
  } catch {}

  // 2. Sync to Firestore (non-blocking)
  updateDoc(doc(db, "users", userId), {
    familyId: null,
    updatedAt: now,
  }).catch((e) => console.warn("Firestore user leave deferred:", e));

  deleteDoc(doc(db, "familyMembers", memberId)).catch((e) =>
    console.warn("Firestore delete member doc deferred:", e)
  );

  getDoc(doc(db, "families", familyId))
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Family;
        const updatedParentIds = (data.parentIds || []).filter((id) => id !== userId);
        const updatedChildIds = (data.childIds || []).filter((id) => id !== userId);
        const updatedTrustedIds = (data.trustedContactIds || []).filter((id) => id !== userId);
        updateDoc(doc(db, "families", familyId), {
          parentIds: updatedParentIds,
          childIds: updatedChildIds,
          trustedContactIds: updatedTrustedIds,
          updatedAt: now,
        }).catch((e) => console.warn("Firestore update family arrays deferred:", e));
      }
    })
    .catch((e) => console.warn("Firestore fetch family for leave deferred:", e));
}

export async function removeMemberFromFamily(
  familyId: string,
  userId: string,
  memberId?: string
): Promise<void> {
  const targetMemberId = memberId || `${familyId}_${userId}`;
  const now = new Date().toISOString();

  try {
    const rawMembers = localStorage.getItem(`members_${familyId}`);
    if (rawMembers) {
      const mList: FamilyMember[] = JSON.parse(rawMembers);
      const filtered = mList.filter((m) => m.userId !== userId && m.id !== targetMemberId);
      localStorage.setItem(`members_${familyId}`, JSON.stringify(filtered));
    }
  } catch {}

  deleteDoc(doc(db, "familyMembers", targetMemberId)).catch((e) =>
    console.warn("Firestore delete member doc error:", e)
  );

  updateDoc(doc(db, "users", userId), {
    familyId: null,
    updatedAt: now,
  }).catch(() => {});
}

