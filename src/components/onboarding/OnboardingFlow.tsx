import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";
import { createFamily, joinFamilyWithCode, saveUserProfile } from "../../services/familyService";
import { Heart, Users, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

export const OnboardingFlow: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<"role" | "family_choice" | "create_family" | "join_family">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole>("child");
  const [displayName, setDisplayName] = useState<string>(user?.displayName || "");
  const [relationship, setRelationship] = useState<string>("");
  const [elderlyTitle, setElderlyTitle] = useState<string>("Mẹ");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");

  const [familyName, setFamilyName] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleSelected = (role: UserRole) => {
    setSelectedRole(role);
    if (role === "parent") {
      setRelationship("Bố/Mẹ");
      setFamilyName(`Gia đình ${displayName || "Thân Yêu"}`);
    } else {
      setRelationship("Con cái");
    }
    setStep("family_choice");
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const now = new Date().toISOString();
      const profileToSave: any = {
        uid: user.uid,
        email: user.email || "",
        displayName: displayName.trim() || user.displayName || "Thành viên",
        role: selectedRole,
        relationship: relationship.trim() || (selectedRole === "parent" ? "Bố/Mẹ" : "Con cái"),
        createdAt: now,
        updatedAt: now,
      };

      if (selectedRole === "parent" && elderlyTitle) {
        profileToSave.elderlyTitle = elderlyTitle;
      }
      if (emergencyPhone.trim()) {
        profileToSave.emergencyPhone = emergencyPhone.trim();
      }

      const result = await createFamily(
        user.uid,
        profileToSave,
        familyName.trim() || `Gia đình ${displayName || "Hạnh Phúc"}`
      );

      await saveUserProfile({
        ...profileToSave,
        familyId: result.family.id,
      });

      await refreshProfile();
    } catch (err: any) {
      console.error("Create family error:", err);
      setErrorMsg(err?.message || "Không thể tạo nhóm gia đình. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanCode = inviteCode.trim().replace(/[\s-]/g, "").toUpperCase();
      const now = new Date().toISOString();
      const profileToJoin: any = {
        uid: user.uid,
        email: user.email || "",
        displayName: displayName.trim() || user.displayName || "Thành viên",
        role: selectedRole,
        relationship: relationship.trim() || (selectedRole === "parent" ? "Bố/Mẹ" : "Con cái"),
        createdAt: now,
        updatedAt: now,
      };

      if (selectedRole === "parent" && elderlyTitle) {
        profileToJoin.elderlyTitle = elderlyTitle;
      }
      if (emergencyPhone.trim()) {
        profileToJoin.emergencyPhone = emergencyPhone.trim();
      }

      const result = await joinFamilyWithCode(
        user.uid,
        profileToJoin,
        cleanCode,
        relationship.trim() || (selectedRole === "parent" ? "Bố/Mẹ" : "Con cái")
      );

      await saveUserProfile({
        ...profileToJoin,
        familyId: result.family.id,
      });

      await refreshProfile();
    } catch (err: any) {
      console.error("Join family error:", err);
      setErrorMsg(err?.message || "Không tìm thấy mã nhóm hoặc đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <div className="w-full max-w-md bg-white border border-[#E6F0EB] rounded-3xl p-6 sm:p-8 shadow-xl text-left space-y-6">
        
        {/* Step 1: Role Selection */}
        {step === "role" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center mx-auto shadow-xs">
                <Heart className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Vai trò của bạn</h2>
              <p className="text-xs text-slate-500">
                Hãy chọn vai trò để ứng dụng tùy biến giao diện phù hợp nhất cho bạn.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleRoleSelected("parent")}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-[#159447] hover:bg-[#E8F8F0]/40 flex items-center gap-4 transition-all text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E8F8F0] text-[#159447] flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Bố / Mẹ / Ông / Bà</h3>
                  <p className="text-xs text-slate-500">Giao diện một nút chạm "Báo bình an" cực kỳ đơn giản</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelected("child")}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-[#159447] hover:bg-[#E8F8F0]/40 flex items-center gap-4 transition-all text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F0F7F4] text-[#159447] flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Con cái / Người thân</h3>
                  <p className="text-xs text-slate-500">Theo dõi an tâm, phân tích cảm xúc và chăm sóc từ xa</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Family Choice */}
        {step === "family_choice" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Nhóm gia đình</h2>
              <p className="text-xs text-slate-500">
                Bạn muốn tạo nhóm mới hay đã có mã mời từ người thân?
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep("create_family")}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-[#2EBD6E] hover:bg-[#E8F8F0]/40 flex items-center justify-between transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Tạo nhóm gia đình mới</h3>
                    <p className="text-xs text-slate-500">Tạo mã mời để gửi cho người thân</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setStep("join_family")}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-[#2EBD6E] hover:bg-[#E8F8F0]/40 flex items-center justify-between transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Nhập mã tham gia nhóm</h3>
                    <p className="text-xs text-slate-500">Dành cho thành viên đã có mã mời</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-xs text-slate-400 hover:text-slate-600 w-full text-center"
            >
              ← Quay lại chọn vai trò
            </button>
          </div>
        )}

        {/* Step 3A: Create Family Form */}
        {step === "create_family" && (
          <form onSubmit={handleCreateFamily} className="space-y-4 animate-in fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Tạo nhóm gia đình</h2>
              <p className="text-xs text-slate-500">Nhập tên của bạn và tên nhóm</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên của bạn:</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên nhóm gia đình:</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="VD: Gia đình Bác Ba"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                required
              />
            </div>

            {selectedRole === "parent" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xưng hô:</label>
                <select
                  value={elderlyTitle}
                  onChange={(e) => setElderlyTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                >
                  <option value="Mẹ">Mẹ</option>
                  <option value="Bố">Bố</option>
                  <option value="Bà">Bà</option>
                  <option value="Ông">Ông</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên lạc:</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-xs"
            >
              {loading ? "Đang tạo nhóm..." : "Hoàn tất & Bắt đầu"}
            </button>

            <button
              type="button"
              onClick={() => setStep("family_choice")}
              className="text-xs text-slate-400 hover:text-slate-600 w-full text-center block pt-1"
            >
              ← Quay lại
            </button>
          </form>
        )}

        {/* Step 3B: Join Family Form */}
        {step === "join_family" && (
          <form onSubmit={handleJoinFamily} className="space-y-4 animate-in fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Nhập mã mời</h2>
              <p className="text-xs text-slate-500">Nhập mã 6 ký tự được chia sẻ từ người thân</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã mời:</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="VD: FAM123"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-lg font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên của bạn:</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6E]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-xs"
            >
              {loading ? "Đang tham gia..." : "Tham gia gia đình"}
            </button>

            <button
              type="button"
              onClick={() => setStep("family_choice")}
              className="text-xs text-slate-400 hover:text-slate-600 w-full text-center block pt-1"
            >
              ← Quay lại
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
