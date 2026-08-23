import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Heart, ShieldCheck, Sparkles, Mic, PhoneCall, CheckCircle2, Lock, ArrowRight } from "lucide-react";

export const LandingPage: React.FC = () => {
  const { signIn, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error?.message || "Không thể đăng nhập bằng Google. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#E6F0EB] bg-[#F8FAF9]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] flex items-center justify-center text-[#2EBD6E] shadow-xs">
              <Heart className="w-5 h-5 fill-none stroke-[2.3]" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">I'm Here For You</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập với Google"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F8F0] text-[#2EBD6E] text-xs font-bold tracking-wide border border-[#DCF5E8]">
            <Sparkles className="w-3.5 h-3.5" />
            Gắn kết gia đình với tình yêu thương
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Bạn vẫn ở đây. <span className="text-[#2EBD6E]">Tôi vẫn ổn.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-normal max-w-xl mx-auto">
            Một lần chạm nhỏ để người bạn yêu thương biết rằng hôm nay bạn vẫn an toàn và mạnh khỏe.
          </p>

          {/* CTA Box */}
          <div className="pt-3 flex flex-col items-center gap-3">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full sm:w-auto min-w-[280px] px-7 py-4 rounded-2xl bg-[#2EBD6E] hover:bg-[#27AE60] active:scale-95 text-white text-base font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Heart className="w-5 h-5 fill-white stroke-none" />
                  <span>Bắt đầu với Google</span>
                </>
              )}
            </button>

            {authError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl">
                {authError}
              </p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Bảo mật Firebase &amp; Quyền riêng tư gia đình</span>
            </div>
          </div>
        </div>

        {/* Feature Pillars */}
        <div className="mt-14 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E6F0EB] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center font-bold text-xl">
                <Heart className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">Check-in một chạm</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nút "Tôi vẫn ổn" to rõ, thiết kế trực quan và êm dịu, giúp bố mẹ dễ dàng thông báo tình hình mỗi ngày.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E6F0EB] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center font-bold text-xl">
                <Sparkles className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">An tâm 2 chiều</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Con cái và bố mẹ đều có thể gửi lời nhắn và trạng thái cho nhau, gắn kết mọi lúc mọi nơi.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E6F0EB] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8F0] text-[#2EBD6E] flex items-center justify-center font-bold text-xl">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">Bảo vệ &amp; Trợ giúp</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hỗ trợ cảnh báo khẩn cấp, tra cứu địa điểm y tế gần nhất và kết nối video Google Meet nhanh chóng.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6F0EB] py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2026 I'm Here For You. Vì gia đình là tất cả.</p>
          <div className="flex items-center gap-4">
            <span>Bảo mật dữ liệu</span>
            <span>Google Cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
