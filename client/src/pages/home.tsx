import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Add custom CSS for animations
const customStyles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

export default function Home() {
  const { user } = useAuth();
  
  /* Reset body opacity on mount */
  useEffect(() => {
    document.body.style.opacity = "1";
    document.body.classList.remove("navigating");
    return () => {
      document.body.style.opacity = "1";
    };
  }, []);
  
  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.location.href = "/login";
  };
  
  const handleSignup = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.location.href = "/register";
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen relative font-inter text-gray-900 overflow-hidden">
      {/* ——— Premium dark gradient backdrop ——— */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900" />
      {/* Overlay gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
      {/* Animated mesh gradient */}
              <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* ——— PREMIUM NAVBAR ——— */}
      <header className="relative z-30 py-4 sm:py-6 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: QuoteBid logo */}
          <div className="flex items-center">
            <span className="text-white font-black text-2xl sm:text-3xl tracking-tight">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
            </span>
            <div className="ml-2 sm:ml-3 px-1.5 sm:px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              Beta
            </div>
          </div>

          {/* Right: Login/Signup */}
          {!user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={handleLogin}
                variant="ghost"
                className="text-white hover:text-blue-300 hover:bg-white/10 text-sm sm:text-base px-3 sm:px-4 py-2 transition-colors duration-300"
              >
                Login
              </Button>
              <Button
                onClick={handleSignup}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white text-sm sm:text-base px-4 sm:px-6 py-2 rounded-xl font-bold shadow-xl transition-all duration-300 hover:scale-105"
              >
                Start Free
              </Button>
            </div>
          )}
        </div>
      </header>
      
      {/* ——— HERO SECTION ——— */}
      <section className="relative z-20 pt-20 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 overflow-hidden">
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-16 relative z-10">
          {/* Copy */}
          <div className="md:w-1/2 text-center md:text-left">
            <div className="mb-4 sm:mb-6">
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs sm:text-sm font-semibold uppercase tracking-wide backdrop-blur-sm">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                World's First PR Pricing Engine
              </div>
          </div>
          
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tight mb-6 sm:mb-8">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                The First Live
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
                Marketplace
              </span>
              <br />
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                for Earned Media
              </span>
                </h1>
            
            <p className="text-blue-300 text-lg sm:text-xl font-bold tracking-wide mb-4 sm:mb-6">
              Built for experts, not PR agencies.
            </p>
            
            <p className="text-gray-300 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-8 sm:mb-12 mx-auto md:mx-0">
              QuoteBid's Dynamic Pricing Engine tracks live demand, inventory, and outlet yield data to
              price PR coverage in real time—<span className="text-white font-semibold">no retainers, no agencies, and no static prices</span>, 
              only pay if you're published.
                </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-md mx-auto md:mx-0">
              <Button
                onClick={handleSignup}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-2xl text-base sm:text-lg font-bold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                Start Free Trial
              </Button>
              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full sm:w-auto border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 py-3 sm:py-4 px-6 sm:px-8 rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 backdrop-blur-sm"
              >
                Sign In
              </Button>
            </div>
          </div>

              <div className="md:w-1/2 flex justify-center md:justify-end mt-8 md:mt-0">
                <div className="relative w-full max-w-sm sm:max-w-md">
              {/* Premium ambient glow effects */}
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-violet-600/20 rounded-3xl blur-3xl animate-pulse"></div>
              <div className="absolute -inset-3 sm:-inset-6 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-violet-500/15 rounded-3xl blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
                  
              {/* Card deck with shuffle animation */}
              <div className="relative group" style={{height: '400px', width: '100%'}}>
                
                {/* Card 1 - Bloomberg (top of stack) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-700 ease-in-out z-30 group-hover:-rotate-12 group-hover:-translate-x-20 group-hover:translate-y-8 group-hover:scale-95">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">B</span>
                        </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg">Bloomberg</h3>
                        <p className="text-blue-200 text-xs">Expert Request</p>
                        </div>
                      </div>
                    <div className="px-2 sm:px-3 py-1 bg-blue-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 1</span>
                    </div>
                    </div>
                    
                  <div className="mb-3 sm:mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 leading-tight">
                    Finance Experts For a Story on S&P 500 Market Outlook
                  </h4>
                  
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed mb-3 sm:mb-4">
                    Bloomberg is seeking finance experts for exclusive commentary on current S&P 500 trends...
                  </p>
                  
                  <div className="inline-block px-2 sm:px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs mb-3 sm:mb-4">
                    • Capital Markets
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-xl sm:text-2xl font-black text-white">$245</div>
                      <div className="text-xs text-blue-200">Current Price</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-300 font-semibold">Active</div>
                      <div className="text-xs text-blue-200">Deadline: Dec 15</div>
                    </div>
                  </div>
                </div>
                
                {/* Card 2 - WSJ (middle) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-700 ease-in-out transform translate-x-2 translate-y-2 scale-98 z-20 group-hover:rotate-6 group-hover:translate-x-10 group-hover:translate-y-4 group-hover:scale-95">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">W</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg">Wall Street Journal</h3>
                        <p className="text-blue-200 text-xs">Expert Commentary</p>
                      </div>
                    </div>
                    <div className="px-2 sm:px-3 py-1 bg-orange-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 1</span>
                    </div>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 leading-tight">
                    Tech Industry Analysis on AI Regulation Impact
                  </h4>
                  
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed mb-3 sm:mb-4">
                    WSJ needs tech industry experts to provide insights on emerging AI regulations...
                  </p>
                  
                  <div className="inline-block px-2 sm:px-3 py-1 bg-orange-500/30 text-orange-200 rounded-full text-xs mb-3 sm:mb-4">
                    • Technology
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-xl sm:text-2xl font-black text-white">$189</div>
                      <div className="text-xs text-blue-200">Current Price</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-300 font-semibold">Active</div>
                      <div className="text-xs text-blue-200">Deadline: Dec 18</div>
                    </div>
                  </div>
                </div>
                
                {/* Card 3 - Yahoo Finance (bottom) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-700 ease-in-out transform translate-x-4 translate-y-4 scale-96 z-10 group-hover:rotate-12 group-hover:translate-x-20 group-hover:translate-y-8 group-hover:scale-95">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">Y</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg">Yahoo Finance</h3>
                        <p className="text-blue-200 text-xs">Market Coverage</p>
                      </div>
                    </div>
                    <div className="px-2 sm:px-3 py-1 bg-purple-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 1</span>
                    </div>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 leading-tight">
                    Capital Market Experts For eVTOL Stocks Story
                  </h4>
                  
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed mb-3 sm:mb-4">
                    The eVTOL sector is heating up in public equity markets...
                  </p>
                  
                  <div className="inline-block px-2 sm:px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs mb-3 sm:mb-4">
                    • Capital Markets
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-xl sm:text-2xl font-black text-white">$312</div>
                      <div className="text-xs text-blue-200">Current Price</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-yellow-300 font-semibold">Rising</div>
                      <div className="text-xs text-blue-200">Deadline: Dec 20</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— HOW THIS WORKS NOW ——— */}
      <section id="benefits" className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              See How QuoteBid Works
            </div>
          </div>
          
          <h2 className="text-5xl font-black text-white mb-6">
            Discover a <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">Smarter Way</span> to Get Published
          </h2>
          <p className="text-gray-300 text-xl max-w-4xl mx-auto mb-16 leading-relaxed">
            Real-time access. Market-based pricing. Direct pitches — full editorial control stays with the journalist.
          </p>
            
            <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "You Bid, Not Guess",
                desc: "Every story has a real-time price. You decide what it's worth to you — not an agency.",
                icon: "🎯"
              },
              {
                title: "Only Pay If You're Quoted",
                desc: "No retainers. No upfront fees. If you're not placed, you pay nothing.",
                icon: "✅"
              },
                              {
                  title: "Real-Time Pricing Engine",
                  desc: "Our Pricing Engine and Agentic SDK find where the market values each story — using live demand, deadlines, and outlet yield.",
                  icon: "⚡"
                },
            ].map((b) => (
              <div
                key={b.title}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:scale-105"
              >
                <div className="text-4xl mb-6">{b.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{b.title}</h3>
                <p className="text-gray-300 leading-relaxed">{b.desc}</p>
                </div>
            ))}
              </div>
        </div>
      </section>

      {/* ——— HOW IT WORKS ——— */}
      <section id="how-it-works" className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-16 sm:py-20 md:py-24 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            
            <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs sm:text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-6 sm:mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              How QuoteBid Works
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6 leading-tight">
              Get Your Expertise <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">Recognized</span>
            </h2>
            <p className="text-gray-300 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              QuoteBid connects you directly with journalists from top-tier publications. No intermediaries, no retainers—just you, your expertise, and the media coverage you deserve.
            </p>
          </div>

          <ol className="space-y-16 sm:space-y-20 md:space-y-24">
            {[
              { 
                step: '1', 
                title: 'Browse Open Opportunities', 
                copy: 'See live opportunities from premium publications. Our pricing engine shows real-time demand so you know exactly what coverage costs.' 
              },
              { 
                step: '2', 
                title: 'Submit Your Expert Pitch', 
                copy: 'Respond directly to journalists with your unique insights. No intermediaries, no PR agencies—just you and your expertise.' 
              },
              { 
                step: '3', 
                title: 'Get Published & Pay Only If Featured', 
                copy: 'If selected, you\'re featured in the article and charged only upon successful publication. No upfront costs, no retainers.' 
              }
            ].map((s, i) => (
              <li
                key={s.step}
                className={`flex flex-col lg:flex-row ${
                  i % 2 ? "lg:flex-row-reverse" : ""
                } items-center gap-8 sm:gap-12 lg:gap-16`}
              >
                <div className="lg:w-1/2 text-center lg:text-left">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-black mb-4 sm:mb-6 shadow-2xl mx-auto lg:mx-0">
                    {s.step}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight">{s.title}</h3>
                  <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">{s.copy}</p>
                </div>
                <div className="lg:w-1/2 w-full max-w-md sm:max-w-lg lg:max-w-none">
                  {i === 0 ? (
                    // App Preview for Step 1 - Matching actual app layout
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                      {/* App Header */}
                      <div className="bg-white/10 border-b border-white/20 p-3 sm:p-4">
                        <h3 className="text-white font-bold text-base sm:text-lg mb-2">Media Opportunities</h3>
                        <p className="text-gray-300 text-xs sm:text-sm">Browse open opportunities from top publications and lock in your bid before prices increase.</p>
                      </div>
                      
                      {/* Single Large Card Preview - Yahoo Finance */}
                      <div className="p-4 sm:p-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 sm:p-4 hover:bg-white/20 transition-all duration-300">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xs sm:text-sm">Y</span>
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm sm:text-base">Yahoo Finance</h4>
                                <p className="text-blue-200 text-xs">Live Opportunity</p>
                              </div>
                            </div>
                            <div className="px-2 py-1 bg-purple-500 rounded-full">
                              <span className="text-white font-bold text-xs">Tier 1</span>
                            </div>
                          </div>
                          
                          {/* Title */}
                          <h5 className="text-white font-bold text-sm sm:text-base mb-2 sm:mb-3 leading-tight">
                            Capital Market Experts For eVTOL Stocks Story
                          </h5>
                          
                          {/* Description */}
                          <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">
                            Looking for experts to provide insights on the emerging eVTOL market and its impact on aviation stocks...
                          </p>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                            <span className="px-2 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs">Capital Markets</span>
                            <span className="px-2 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs">Aviation</span>
                          </div>
                          
                          {/* Price and Action */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white text-lg sm:text-xl font-black">$312</div>
                              <div className="text-blue-200 text-xs">Current Price</div>
                            </div>
                            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200">
                              Submit Pitch
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : i === 1 ? (
                    // Pitch interface mockup for Step 2
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                      <div className="bg-white/10 border-b border-white/20 p-3 sm:p-4">
                        <h3 className="text-white font-bold text-base sm:text-lg mb-2">Submit Your Pitch</h3>
                        <p className="text-gray-300 text-xs sm:text-sm">Craft your response directly to the journalist.</p>
                      </div>
                      
                      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div>
                          <label className="text-white text-xs sm:text-sm font-semibold mb-2 block">Your Expert Response</label>
                          <div className="bg-white/10 border border-white/20 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[100px]">
                            <p className="text-gray-300 text-xs sm:text-sm">
                              "As a capital markets analyst with 15 years of experience, I see the eVTOL sector as a transformational opportunity. The recent IPO activity in companies like Joby Aviation demonstrates strong investor confidence..."
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="text-white text-xs font-semibold mb-1 block">Your Bid</label>
                            <div className="bg-white/10 border border-white/20 rounded-lg p-2 sm:p-3 text-center">
                              <span className="text-white font-bold text-sm sm:text-base">$285</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-white text-xs font-semibold mb-1 block">Status</label>
                            <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-2 sm:p-3 text-center">
                              <span className="text-green-300 font-semibold text-xs sm:text-sm">Submitted</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Success/Analytics dashboard for Step 3
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                      <div className="bg-white/10 border-b border-white/20 p-3 sm:p-4">
                        <h3 className="text-white font-bold text-base sm:text-lg mb-2">Your Success Dashboard</h3>
                        <p className="text-gray-300 text-xs sm:text-sm">Track your published articles and earnings.</p>
                      </div>
                      
                      <div className="p-4 sm:p-6">
                        {/* Featured Article */}
                        <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span className="text-green-300 font-semibold text-xs sm:text-sm">Published Successfully</span>
                          </div>
                          <h4 className="text-white font-bold text-xs sm:text-sm mb-1">
                            "eVTOL Stocks Soar as Industry Takes Flight"
                          </h4>
                          <p className="text-gray-300 text-xs">Yahoo Finance • 2 days ago</p>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                          <div className="text-center">
                            <div className="text-white text-lg sm:text-xl font-bold">8</div>
                            <div className="text-gray-400 text-xs">Published</div>
                              </div>
                          <div className="text-center">
                            <div className="text-white text-lg sm:text-xl font-bold">$1,847</div>
                            <div className="text-gray-400 text-xs">Total Earned</div>
                            </div>
                          <div className="text-center">
                            <div className="text-white text-lg sm:text-xl font-bold">92%</div>
                            <div className="text-gray-400 text-xs">Success Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    </div>
              </li>
            ))}
          </ol>
                  </div>
      </section>

      {/* ——— EDITORIAL INTEGRITY STRIP ——— */}
      <section className="relative z-20 bg-gradient-to-b from-purple-900 to-slate-900 py-24 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
                </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center">
            
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-full text-green-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-8">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Editorial Integrity
              </div>

            <h2 className="text-5xl font-black text-white mb-12 leading-tight">
              Built to Protect the <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">Editorial Line</span>
            </h2>
            
            {/* Principle cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-left">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">100% Editorial Control</h3>
                    <p className="text-gray-300 text-sm">Journalists retain complete editorial control over all content decisions</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-left">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 6 12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">No Media Payments</h3>
                    <p className="text-gray-300 text-sm">We never compensate journalists or media outlets — directly or indirectly.</p>
                  </div>
                            </div>
                          </div>
                          
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-left">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Direct to Reporters</h3>
                    <p className="text-gray-300 text-sm">Pitches are reviewed directly by reporters without intermediaries</p>
                  </div>
                              </div>
                            </div>
                            
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-left">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Independent Platform</h3>
                    <p className="text-gray-300 text-sm">QuoteBid is independent and non-affiliated with any media outlet</p>
                  </div>
                </div>
              </div>
                              </div>
                              
            <Link 
              href="/legal/editorial-integrity"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 hover:from-blue-600 hover:to-green-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Read Our Editorial Integrity Policy
              <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
            </Link>
                                </div>
                              </div>
      </section>

      {/* ——— PRICING ENGINE STRIP ——— */}
      <section className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-20 overflow-hidden">
        {/* Animated data flow background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-64 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
          <div className="absolute top-1/2 right-0 w-48 h-px bg-gradient-to-l from-transparent via-purple-400 to-transparent"></div>
          <div className="absolute bottom-1/4 left-1/4 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                            </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-24">
            
            {/* Left side - Content */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-8">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Pricing Technology
                          </div>
              
              <h2 className="text-5xl font-black text-white mb-8 leading-tight">
                How Our <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Pricing Engine</span> Works
              </h2>
              
              <p className="text-gray-300 text-xl leading-relaxed mb-10">
                Our system introduces price discovery to PR — using demand curves, deadline decay, and outlet yield history to surface market value for each story. Every bid reflects real-time interest.
              </p>
              
              {/* Key features */}
              <div className="space-y-4 mb-10">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-200">Real-time demand tracking</span>
                        </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-200">Deadline decay algorithms</span>
                      </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  <span className="text-gray-200">Outlet yield optimization</span>
                    </div>
                  </div>
              
              <Link 
                href="/engine"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Explore the Pricing Engine
                <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
                </div>
            
            {/* Right side - Engine visualization */}
            <div className="lg:w-1/2 flex justify-center lg:justify-start">
              <div className="relative">
                
                {/* Main engine container */}
                <div className="w-80 h-80 bg-gradient-to-br from-slate-800/50 to-purple-900/50 rounded-3xl backdrop-blur-xl border border-white/20 relative overflow-hidden">
                  
                  {/* Central processing unit */}
                  <div className="absolute inset-12 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl border border-blue-400/40 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-4xl font-bold mb-2">$245</div>
                      <div className="text-blue-300 text-sm">Live Price</div>
              </div>
            </div>
                  
                  {/* Data input nodes */}
                  <div className="absolute top-6 left-6 w-12 h-8 bg-blue-500/30 border border-blue-400/50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-bold">DMD</span>
          </div>
                  <div className="absolute top-6 right-6 w-12 h-8 bg-green-500/30 border border-green-400/50 rounded-lg flex items-center justify-center">
                    <span className="text-green-400 text-xs font-bold">VEL</span>
                  </div>
                  <div className="absolute bottom-6 left-6 w-12 h-8 bg-orange-500/30 border border-orange-400/50 rounded-lg flex items-center justify-center">
                    <span className="text-orange-400 text-xs font-bold">TME</span>
                  </div>
                  <div className="absolute bottom-6 right-6 w-12 h-8 bg-purple-500/30 border border-purple-400/50 rounded-lg flex items-center justify-center">
                    <span className="text-purple-400 text-xs font-bold">YLD</span>
        </div>

                  {/* Data flow lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="flowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6"/>
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.2"/>
                      </linearGradient>
                    </defs>
                    <line x1="15%" y1="20%" x2="35%" y2="35%" stroke="url(#flowGrad1)" strokeWidth="2"/>
                    <line x1="85%" y1="20%" x2="65%" y2="35%" stroke="url(#flowGrad1)" strokeWidth="2"/>
                    <line x1="15%" y1="80%" x2="35%" y2="65%" stroke="url(#flowGrad1)" strokeWidth="2"/>
                    <line x1="85%" y1="80%" x2="65%" y2="65%" stroke="url(#flowGrad1)" strokeWidth="2"/>
                  </svg>
                  
                  {/* Processing indicators */}
                  <div className="absolute top-1/2 left-4 w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="absolute top-1/2 right-4 w-2 h-2 bg-purple-400 rounded-full"></div>
                  <div className="absolute top-4 left-1/2 w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute bottom-4 left-1/2 w-2 h-2 bg-orange-400 rounded-full"></div>
                  
                  {/* Background circuit pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                      backgroundImage: `
                        linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                        linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                </div>
                
                {/* Floating data metrics */}
                <div className="absolute -top-4 -left-4 bg-blue-500/20 border border-blue-400/40 rounded-xl px-3 py-2">
                  <div className="text-blue-400 text-xs font-bold">8.4k</div>
                  <div className="text-blue-300 text-xs">signals</div>
                </div>
                
                <div className="absolute -top-4 -right-4 bg-green-500/20 border border-green-400/40 rounded-xl px-3 py-2">
                  <div className="text-green-400 text-xs font-bold">+2.1</div>
                  <div className="text-green-300 text-xs">velocity</div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-orange-500/20 border border-orange-400/40 rounded-xl px-3 py-2">
                  <div className="text-orange-400 text-xs font-bold">47.8h</div>
                  <div className="text-orange-300 text-xs">remaining</div>
                </div>
                
                <div className="absolute -bottom-4 -right-4 bg-purple-500/20 border border-purple-400/40 rounded-xl px-3 py-2">
                  <div className="text-purple-400 text-xs font-bold">84%</div>
                  <div className="text-purple-300 text-xs">yield</div>
                </div>
                
                {/* Orbiting elements */}
                <div className="absolute top-1/2 -left-8 w-6 h-6 bg-cyan-400/30 rounded-full"></div>
                <div className="absolute top-1/2 -right-8 w-6 h-6 bg-pink-400/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— PRICING SECTION ——— */}
      <section className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-24">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              Start Today
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Join the New Era of <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">Media Access</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
                No retainers. No guesswork. Just you, the story, and a price you control.
              </p>
            </div>
            
          <div className="flex flex-col lg:flex-row gap-12 items-stretch max-w-6xl mx-auto">
              {/* Left side: Benefits */}
            <div className="lg:w-1/2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-10 lg:p-12">
              <h3 className="text-3xl font-bold mb-8 text-white">Reclaim Control of How You Get Covered</h3>
                
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m5 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-5 4h6m-6 4h6m-6-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                    <h4 className="text-xl font-semibold mb-2 text-white">Access Live Editorial Opportunities</h4>
                    <p className="text-gray-300 leading-relaxed">Log in and browse time-sensitive, real media requests — curated, categorized, and priced by demand.</p>
                    </div>
                  </div>
                  
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div>
                    <h4 className="text-xl font-semibold mb-2 text-white">Bid for Coverage at Market Price</h4>
                    <p className="text-gray-300 leading-relaxed">Every pitch is a bid. You decide what coverage is worth to you. No retainers, no fixed fees — just real-time pricing that adjusts with demand.</p>
                    </div>
                  </div>
                  
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                    <h4 className="text-xl font-semibold mb-2 text-white">Pay Only When You're Published</h4>
                    <p className="text-gray-300 leading-relaxed">There's no upfront cost to pitch. You're only charged if your quote appears in the final published article. No placement? No charge.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2 text-white">Submit Pitches with Your Voice</h4>
                    <p className="text-gray-300 leading-relaxed">Record your pitch, we transcribe it instantly. Submit in seconds — no formatting stress, no friction.</p>
                  </div>
                  </div>
                </div>
              </div>
              
            {/* Right side: Pricing Card */}
            <div className="lg:w-1/2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-8 py-8 border-b border-white/20">
                  <div className="flex justify-between items-start">
                    <div>
                    <h3 className="text-2xl font-bold text-white mb-1">QuoteBid</h3>
                    <p className="text-gray-300 text-lg">Premium Membership</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline">
                      <span className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
                        $99.99
                      </span>
                      <span className="ml-2 text-lg text-gray-300">/month</span>
                      </div>
                    <p className="text-gray-400 text-sm mt-1">Billed monthly</p>
                    </div>
                  </div>
                  
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mt-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-3 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    <div>
                      <p className="text-blue-300 font-medium text-sm">Subscription required to access the marketplace</p>
                      <p className="text-blue-200 text-xs mt-1">Cancel anytime • No contracts • No commitments</p>
                    </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    <span className="text-white text-lg">Unlimited access to all media opportunities</span>
                    </li>
                    <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    <span className="text-white text-lg">Voice recording with AI transcription</span>
                    </li>
                    <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    <span className="text-white text-lg">Dynamic bidding platform with real-time pricing</span>
                    </li>
                    <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    <span className="text-white text-lg">Payment only when your quotes get published</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-white text-lg">Live market data and pricing insights</span>
                    </li>
                  </ul>
                  
                <div className="space-y-4">
                    <Button 
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-2xl shadow-2xl transition-all duration-300"
                      size="lg"
                      onClick={handleSignup}
                    >
                      Get Full Marketplace Access
                    </Button>
                    
                    <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      Join thousands of experts already using QuoteBid
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-20 bg-gradient-to-b from-purple-900 to-slate-900 py-12 sm:py-16">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center group">
              <span className="text-white font-black text-3xl sm:text-4xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
              </span>
              <div className="ml-2 sm:ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                Beta
      </div>
            </Link>
            <p className="text-gray-400 mt-3 sm:mt-4 text-base sm:text-lg">
              The world's first live marketplace for earned media
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-6 sm:mb-8">
            <Link href="/legal/terms" className="text-gray-300 text-base sm:text-lg font-medium hover:text-white transition-colors duration-300">
              Terms of Use
            </Link>
            <Link href="/privacy" className="text-gray-300 text-base sm:text-lg font-medium hover:text-white transition-colors duration-300">
              Privacy
            </Link>
            <Link href="/legal/editorial-integrity" className="text-gray-300 text-base sm:text-lg font-medium hover:text-white transition-colors duration-300">
              Editorial Integrity
            </Link>
          </div>
          
          <div className="text-gray-500 text-sm sm:text-base">
            © 2024 QuoteBid. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}