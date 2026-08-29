import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Heart, ShieldCheck, Sparkles, ArrowRight, ArrowLeftRight } from "lucide-react";

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
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-950">
      {/* Header */}
      <header className="border-b border-slate-200/50 bg-[#F5F5F7]/80 backdrop-blur-md sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-900 border border-slate-200/60 shadow-3xs group-hover:scale-105 transition-all duration-300">
              <Heart className="w-4.5 h-4.5 fill-none stroke-[2] text-[#2EBD6E] group-hover:fill-[#2EBD6E] transition-all duration-300" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-base">I'm Here For You</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-97 text-white text-xs font-medium transition-all shadow-3xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:shadow-xs"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-28 md:py-36 flex-1 flex flex-col justify-center items-center w-full">
        <div className="max-w-3xl mx-auto text-center space-y-8 flex flex-col items-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-emerald-600 text-xs font-medium border border-slate-200/60 shadow-3xs animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5 fill-none stroke-[2]" />
            Gắn kết gia đình với tình yêu thương
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] animate-fade-in-up animation-delay-100">
            Con vẫn ở đây
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-500 leading-relaxed font-normal max-w-xl mx-auto animate-fade-in-up animation-delay-200">
            Một lần chạm nhỏ để người bạn yêu thương biết rằng hôm nay bạn vẫn an toàn và mạnh khỏe.
          </p>

          {/* CTA Box */}
          <div className="pt-4 w-full sm:w-auto flex flex-col items-center gap-4 animate-fade-in-up animation-delay-300">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full sm:w-auto min-w-[260px] px-8 py-4 rounded-full bg-[#2EBD6E] hover:bg-[#25a25e] active:scale-97 text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg hover:shadow-emerald-500/10"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-white stroke-none animate-pulse" />
                  <span>Bắt đầu với Google</span>
                </>
              )}
            </button>

            {authError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-2xl animate-fade-in-up">
                {authError}
              </p>
            )}
          </div>
        </div>

        {/* Feature Pillars */}
        <div className="mt-20 sm:mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full animate-fade-in-up animation-delay-400">
          
          {/* Card 1 */}
          <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                <Heart className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-slate-900 text-lg transition-colors duration-300">Check-in một chạm</h2>
                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                  Nút bấm to rõ, giúp bố mẹ dễ dàng báo an toàn mỗi ngày.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                <ArrowLeftRight className="w-5 h-5 stroke-[1.8] group-hover:rotate-180 transition-transform duration-500" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-slate-900 text-lg transition-colors duration-300">An tâm 2 chiều</h2>
                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                  Gửi tin nhắn thoại và trạng thái hai chiều tiện lợi.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                <ShieldCheck className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-slate-900 text-lg transition-colors duration-300">Bảo vệ &amp; Trợ giúp</h2>
                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                  Cảnh báo khẩn cấp và kết nối video hỗ trợ nhanh chóng.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/40 py-8 bg-[#F5F5F7] transition-all duration-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 I'm Here For You. Vì gia đình là tất cả.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Bảo mật dữ liệu</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Google Cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
