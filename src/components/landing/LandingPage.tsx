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
    <div className="relative h-screen w-screen bg-[#F5F5F7] text-slate-900 flex flex-col justify-between overflow-hidden selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* Premium Apple-style background ambient blurs */}
      <div className="absolute top-[-5%] right-[-5%] w-72 h-72 sm:w-96 sm:h-96 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-5%] left-[-5%] w-72 h-72 sm:w-96 sm:h-96 bg-blue-500/4 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="flex-none border-b border-slate-200/40 bg-[#F5F5F7]/70 backdrop-blur-md z-30 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-900 border border-slate-200/50 shadow-3xs group-hover:scale-105 transition-all duration-300">
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
      <main className="flex-1 max-w-6xl mx-auto px-5 sm:px-8 py-3 sm:py-6 flex flex-col justify-center items-center w-full overflow-hidden">
        <div className="w-full flex-1 flex flex-col justify-around items-center max-h-[720px] space-y-4 md:space-y-0">
          
          {/* Main Hero Typography & CTA */}
          <div className="max-w-2xl text-center space-y-4 md:space-y-6 flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-emerald-600 text-xs font-medium border border-slate-200/60 shadow-3xs animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 fill-none stroke-[2]" />
              Gắn kết gia đình với tình yêu thương
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] animate-fade-in-up animation-delay-100">
              Con vẫn ở đây
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base md:text-lg text-slate-500 leading-relaxed font-normal max-w-xs sm:max-w-md md:max-w-lg mx-auto animate-fade-in-up animation-delay-200">
              Một lần chạm nhỏ để người bạn yêu thương biết rằng hôm nay bạn vẫn an toàn và mạnh khỏe.
            </p>

            {/* CTA Box - Highlighted with premium cta shadow pulsing glow */}
            <div className="pt-1.5 w-full sm:w-auto flex flex-col items-center gap-3 animate-fade-in-up animation-delay-300">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-full bg-[#2EBD6E] hover:bg-[#25a25e] active:scale-97 text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-md shadow-emerald-500/15 hover:shadow-lg animate-cta-glow"
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

          {/* MOBILE VIEW LAYOUT (Grouped iOS-style Settings Widget) */}
          <div className="block md:hidden w-full max-w-sm bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 p-5 shadow-2xs divide-y divide-slate-100/70 animate-fade-in-up animation-delay-400">
            
            {/* Mobile Card 1 */}
            <div className="flex items-center gap-4 py-3.5 first:pt-0">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center flex-shrink-0 shadow-3xs">
                <Heart className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5 flex-1">
                <h3 className="font-semibold text-slate-950 text-sm">Check-in một chạm</h3>
                <p className="text-[11px] text-slate-500 font-normal leading-tight">
                  Báo an toàn nhanh chóng mỗi ngày chỉ với một chạm.
                </p>
              </div>
            </div>

            {/* Mobile Card 2 */}
            <div className="flex items-center gap-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100/50 flex items-center justify-center flex-shrink-0 shadow-3xs">
                <ArrowLeftRight className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5 flex-1">
                <h3 className="font-semibold text-slate-950 text-sm">An tâm 2 chiều</h3>
                <p className="text-[11px] text-slate-500 font-normal leading-tight">
                  Nhắn thoại và cập nhật trạng thái hai chiều dễ dàng.
                </p>
              </div>
            </div>

            {/* Mobile Card 3 */}
            <div className="flex items-center gap-4 py-3.5 last:pb-0">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 border border-rose-100/50 flex items-center justify-center flex-shrink-0 shadow-3xs">
                <ShieldCheck className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5 flex-1">
                <h3 className="font-semibold text-slate-950 text-sm">Bảo vệ &amp; Trợ giúp</h3>
                <p className="text-[11px] text-slate-500 font-normal leading-tight">
                  Cảnh báo khẩn cấp và gọi hỗ trợ video nhanh chóng.
                </p>
              </div>
            </div>
          </div>

          {/* DESKTOP VIEW LAYOUT (3-Column Grid Cards) */}
          <div className="hidden md:grid grid-cols-3 gap-6 lg:gap-8 w-full max-w-4xl animate-fade-in-up animation-delay-400">
            
            {/* Desktop Card 1 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between cursor-pointer">
              <div className="space-y-4.5">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <Heart className="w-5.5 h-5.5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900 text-lg group-hover:text-[#2EBD6E] transition-colors duration-300">Check-in một chạm</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-normal">
                    Nút bấm to rõ, giúp bố mẹ dễ dàng báo an toàn mỗi ngày.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Card 2 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between cursor-pointer">
              <div className="space-y-4.5">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <ArrowLeftRight className="w-5.5 h-5.5 stroke-[1.8] group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900 text-lg group-hover:text-[#2EBD6E] transition-colors duration-300">An tâm 2 chiều</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-normal">
                    Gửi tin nhắn thoại và trạng thái hai chiều tiện lợi.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Card 3 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100/60 shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/10 transition-all duration-300 ease-out flex flex-col justify-between cursor-pointer">
              <div className="space-y-4.5">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-800 border border-slate-100/50 group-hover:bg-[#2EBD6E] group-hover:text-white group-hover:border-[#2EBD6E] flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-3xs group-hover:scale-105">
                  <ShieldCheck className="w-5.5 h-5.5 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-slate-900 text-lg group-hover:text-[#2EBD6E] transition-colors duration-300">Bảo vệ &amp; Trợ giúp</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-normal">
                    Cảnh báo khẩn cấp và kết nối video hỗ trợ nhanh chóng.
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
