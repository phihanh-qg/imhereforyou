import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./components/landing/LandingPage";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { Header } from "./components/common/Header";
import { ParentDashboard } from "./components/parent/ParentDashboard";
import { ChildDashboard } from "./components/child/ChildDashboard";
import { FamilySettingsModal } from "./components/child/FamilySettingsModal";
import { UserSettingsModal } from "./components/common/UserSettingsModal";
import { Heart } from "lucide-react";

function MainApp() {
  const { user, profile, family, members, loading, refreshProfile } = useAuth();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showUserSettings, setShowUserSettings] = useState<boolean>(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-4">
        <div className="animate-pulse mb-3 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-[#E8F8F0] flex items-center justify-center text-[#2EBD6E] shadow-sm">
            <Heart className="w-8 h-8 fill-none stroke-[2.3]" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">I'm Here For You</h2>
        <p className="text-xs text-slate-500 mt-0.5">Đang kết nối tài khoản an toàn...</p>
      </div>
    );
  }

  // Not authenticated -> Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated but no profile or no family attached -> Onboarding Flow
  if (!profile || !profile.familyId || !family) {
    return <OnboardingFlow />;
  }

  // Authenticated with profile & family
  const isParent = profile.role === "parent";

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-white text-slate-900 flex flex-col">
      <Header 
        onOpenFamilySettings={() => setShowSettings(true)} 
        onOpenUserSettings={() => setShowUserSettings(true)}
      />
      <main className="flex-1 bg-white min-h-0">
        {isParent ? <ParentDashboard /> : <ChildDashboard />}
      </main>

      {/* Global Modals */}
      {showSettings && (
        <FamilySettingsModal
          family={family}
          members={members}
          onClose={() => setShowSettings(false)}
          onRefresh={refreshProfile}
        />
      )}

      {showUserSettings && (
        <UserSettingsModal
          profile={profile}
          family={family}
          onClose={() => setShowUserSettings(false)}
          onRefresh={refreshProfile}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
