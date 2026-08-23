import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logoutUser } from "../lib/firebase";
import { UserProfile, Family, FamilyMember } from "../types";
import { getUserProfile, getFamily, listenToFamilyMembers, leaveFamily } from "../services/familyService";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  family: Family | null;
  members: FamilyMember[];
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshFamily: () => Promise<void>;
  setDirectAuthState: (profile: UserProfile, family: Family, members?: FamilyMember[]) => void;
  leaveCurrentFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCounter = React.useRef(0);

  // Refresh profile
  const fetchProfile = async (uid: string) => {
    const currentFetchId = ++fetchCounter.current;
    try {
      const p = await getUserProfile(uid);
      if (currentFetchId !== fetchCounter.current) return;
      
      setProfile(p);
      if (p?.familyId) {
        const fam = await getFamily(p.familyId);
        if (currentFetchId !== fetchCounter.current) return;
        setFamily(fam);
      } else {
        setFamily(null);
        setMembers([]);
      }
    } catch (error) {
      console.error("Error fetching user profile in context:", error);
    }
  };

  const setDirectAuthState = (newProfile: UserProfile, newFamily: Family, newMembers?: FamilyMember[]) => {
    fetchCounter.current += 1;
    setProfile(newProfile);
    setFamily(newFamily);
    if (newMembers) {
      setMembers(newMembers);
    }
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
        setFamily(null);
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Family Members whenever familyId changes
  useEffect(() => {
    if (!profile?.familyId) {
      setMembers([]);
      return;
    }

    const unsubMembers = listenToFamilyMembers(profile.familyId, (m) => {
      setMembers(m);
    });

    return () => {
      unsubMembers();
    };
  }, [profile?.familyId]);

  const signIn = async () => {
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      if (u) {
        await fetchProfile(u.uid);
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    fetchCounter.current += 1;
    try {
      await logoutUser();
      setUser(null);
      setProfile(null);
      setFamily(null);
      setMembers([]);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const refreshFamily = async () => {
    if (profile?.familyId) {
      const currentFetchId = ++fetchCounter.current;
      const fam = await getFamily(profile.familyId);
      if (currentFetchId !== fetchCounter.current) return;
      setFamily(fam);
    }
  };

  const leaveCurrentFamily = async () => {
    if (!user || !profile?.familyId) return;
    fetchCounter.current += 1;
    const oldFamilyId = profile.familyId;
    // 1. Instant local reset
    const updatedProfile: UserProfile = { ...profile, familyId: null };
    setProfile(updatedProfile);
    setFamily(null);
    setMembers([]);

    // 2. Perform backend cleanup
    try {
      await leaveFamily(user.uid, oldFamilyId);
    } catch (err) {
      console.warn("Error leaving family:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        family,
        members,
        loading,
        signIn,
        signOut,
        refreshProfile,
        refreshFamily,
        setDirectAuthState,
        leaveCurrentFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
