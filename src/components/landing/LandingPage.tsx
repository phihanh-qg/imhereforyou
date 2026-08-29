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
    <div className="h-screen w-screen bg-[#F5F5F7] text-slate-900 flex flex-col justify-between overflow-hidden selection:bg-emerald-100 selection:text-emerald-950">
      {/* Header */}
      <header className="flex-none border-b border-slate-200/50 bg-[#F5F5F7]/80 backdrop-blur-md z-30 transition-all duration-300">
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
            className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-97 text-white text-xs font-medium transition-all shadow-3xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:shadow-xs"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-5 sm:px-8 py-4 sm:py-6 flex flex-col justify-center items-center w-full overflow-hidden">
        <div className="w-full flex-1 flex flex-col justify-around items-center max-h-[680px]">
          
          {/* Main Hero Typography & CTA */}
          <div className="max-w-2xl text-center space-y-5 md:space-y-6 flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-emerald-600 text-xs font-medium border border-slate-200/60 shadow-3xs animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 fill-none stroke-[2]" />
              Gắn kết gia đình với tình yêu thương
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] animate-fade-in-up animation-delay-100">
              Con vẫn ở đây
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-slate-500 leading-relaxed font-normal max-w-md md:max-w-lg mx-auto animate-fade-in-up animation-delay-200">
              Một lần chạm nhỏ để người bạn yêu thương biết rằng hôm nay bạn vẫn an toàn và mạnh khỏe.
            </p>

            {/* CTA Box */}
            <div className="pt-2 w-full sm:w-auto flex flex-col items-center gap-3 animate-fade-in-up animation-delay-300">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-full bg-[#2EBD6E] hover:bg-[#25a25e] active:scale-97 text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md hover:shadow-emerald-500/10"
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
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl animate-fade-in-up">
                  {authError}
                </p>
              )}
            </div>
          </div>

          {/* Feature Pillars Grid */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 lg:gap-8 w-full max-w-4xl animate-fade-in-up animation-delay-400">
            
            {/* Card 1 */}
            <div className="group bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-7 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
              <div className="space-y-2 md:space-y-4 w-full flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <Heart className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-1 w-full">
                  <h2 className="font-semibold text-slate-900 text-xs sm:text-sm md:text-base transition-colors duration-300">Check-in</h2>
                  <p className="hidden md:block text-xs md:text-sm text-slate-500 leading-relaxed font-normal">
                    Nút bấm to rõ, giúp báo an toàn mỗi ngày.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-7 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
              <div className="space-y-2 md:space-y-4 w-full flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <ArrowLeftRight className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[1.8] group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="space-y-1 w-full">
                  <h2 className="font-semibold text-slate-900 text-xs sm:text-sm md:text-base transition-colors duration-300">An tâm 2 chiều</h2>
                  <p className="hidden md:block text-xs md:text-sm text-slate-500 leading-relaxed font-normal">
                    Gửi lời nhắn thoại và trạng thái hai chiều.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-7 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between">
              <div className="space-y-2 md:space-y-4 w-full flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <ShieldCheck className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-1 w-full">
                  <h2 className="font-semibold text-slate-900 text-xs sm:text-sm md:text-base transition-colors duration-300">Trợ giúp</h2>
                  <p className="hidden md:block text-xs md:text-sm text-slate-500 leading-relaxed font-normal">
                    Cảnh báo khẩn cấp và kết nối hỗ trợ nhanh.
                  </p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none border-t border-slate-200/40 py-4 bg-[#F5F5F7] transition-all duration-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between text-[10px] sm:text-xs text-slate-400">
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
