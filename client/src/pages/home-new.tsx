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
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* ——— PREMIUM NAVBAR ——— */}
      <header className="absolute top-0 w-full z-30 py-6 px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <span className="text-white font-black text-3xl tracking-tight">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
            </span>
            <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              Beta
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 opacity-75 cursor-not-allowed font-semibold px-6 py-3 rounded-xl transition-all duration-300"
              onClick={(e) => e.preventDefault()}
            >
              Log In
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold hover:from-purple-600 hover:to-violet-700 opacity-75 cursor-not-allowed px-6 py-3 rounded-xl transition-all duration-300 shadow-lg"
              onClick={(e) => e.preventDefault()}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* ——— HERO ——— */}
      <section className="relative z-20 pt-40 pb-24 px-6 overflow-hidden">

        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
          {/* Copy */}
          <div className="md:w-1/2">
            <div className="mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                World's First PR Pricing Engine
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black text-white leading-[0.9] tracking-tight">
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
            
            <p className="mt-8 text-blue-300 text-xl font-bold tracking-wide">
              Built for experts, not PR agencies.
            </p>
            
            <p className="mt-6 text-gray-300 text-xl max-w-2xl leading-relaxed">
              QuoteBid's Dynamic Pricing Engine tracks live demand, inventory, and outlet yield data to
              price PR coverage in real time—<span className="text-white font-semibold">no retainers, no middlemen, and no static prices</span>, 
              only pay if you're published.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-6">
              <Button
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-10 py-7 rounded-2xl shadow-2xl opacity-75 cursor-not-allowed transform transition-all duration-300 hover:scale-105"
                onClick={(e) => e.preventDefault()}
              >
                <span className="relative z-10 text-lg">Create an Account</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="group relative border-2 border-white/50 text-white hover:border-white px-10 py-7 rounded-2xl bg-white/5 backdrop-blur-md font-semibold text-lg transition-all duration-300 hover:bg-white/10 hover:scale-105"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <span className="relative z-10">How It Works</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </Button>
            </div>
          </div>

          {/* Interactive card stack */}
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <div className="relative w-full max-w-md">
              {/* Premium ambient glow effects */}
              <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-violet-600/20 rounded-3xl blur-3xl animate-pulse"></div>
              <div className="absolute -inset-6 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-violet-500/15 rounded-3xl blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
              
              {/* Card deck with shuffle animation */}
              <div className="relative group" style={{height: '480px', width: '100%'}}>
                
                {/* Card 1 - Bloomberg (top of stack) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl transition-all duration-700 ease-in-out z-30 group-hover:-rotate-12 group-hover:-translate-x-20 group-hover:translate-y-8 group-hover:scale-95">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">B</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Bloomberg</h3>
                        <p className="text-blue-200 text-xs">Expert Request</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 1</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-3 leading-tight">
                    Looking For Banking Experts To Answer Questions Regarding The Next FOMC Meeting
                  </h4>
                  
                  <p className="text-sm text-blue-100 leading-relaxed mb-4">
                    Banking Experts: 1. Do you think the next FOMC meeting will result in a rate hike or cut? 2. Do you think that core C...
                  </p>
                  
                  <div className="inline-block px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-sm mb-4">
                    • Capital Markets
                  </div>

                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-xs">Current Price</p>
                        <p className="text-white text-2xl font-bold">$207</p>
                      </div>
                      <div className="text-right">
                        <span className="text-red-300 text-xs">📈 $4 past hour</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-blue-200">
                      <span>⏰ 3 days left</span>
                      <span className="px-2 py-1 bg-yellow-500/20 rounded">🔒 Premium</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-200">📌 Saved</span>
                  </div>
                </div>

                {/* Card 2 - Investopedia (middle) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl transition-all duration-700 ease-in-out transform translate-x-2 translate-y-2 scale-98 z-20 group-hover:rotate-6 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">I</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Investopedia</h3>
                        <p className="text-blue-200 text-xs">Market Analysis</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 2</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-3 leading-tight">
                    Real Estate Experts For Commercial Market Story
                  </h4>
                  
                  <p className="text-sm text-blue-100 leading-relaxed mb-4">
                    Looking for commercial real estate market analysis and trends...
                  </p>
                  
                  <div className="inline-block px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-sm mb-4">
                    • Real Estate
                  </div>

                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-xs">Current Price</p>
                        <p className="text-white text-2xl font-bold">$355</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-300 text-xs">📈 $12 past hour</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-blue-200">
                      <span>⏰ 2 days left</span>
                      <span className="px-2 py-1 bg-orange-500/20 rounded">🔥 Hot</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-200">📌 Saved</span>
                  </div>
                </div>

                {/* Card 3 - Yahoo Finance (bottom) */}
                <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl transition-all duration-700 ease-in-out transform translate-x-4 translate-y-4 scale-96 z-10 group-hover:rotate-12 group-hover:translate-x-20 group-hover:translate-y-8 group-hover:scale-95">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Y</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Yahoo Finance</h3>
                        <p className="text-blue-200 text-xs">Market Coverage</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-purple-500 rounded-full">
                      <span className="text-white font-bold text-xs">Tier 1</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      Expert Request
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-3 leading-tight">
                    Capital Market Experts For eVTOL Stocks Story
                  </h4>
                  
                  <p className="text-sm text-blue-100 leading-relaxed mb-4">
                    The eVTOL sector is heating up in public equity markets...
                  </p>
                  
                  <div className="inline-block px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-sm mb-4">
                    • Capital Markets
                  </div>

                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-xs">Current Price</p>
                        <p className="text-white text-2xl font-bold">$224</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-300 text-xs">📈 $25 past hour</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-blue-200">
                      <span>⏰ 8 days left</span>
                      <span className="px-2 py-1 bg-green-500/20 rounded">📈 Trending</span>
                    </div>
                    <span className="px-2 py-1 bg-gray-500/20 rounded text-gray-200">Save</span>
                  </div>
                </div>

                {/* Hover instruction */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Hover to browse opportunities →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— WHAT MAKES US DIFFERENT ——— */}
      <section id="benefits" className="relative z-20 bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold mb-4">
            Why QuoteBid Beats Retainers
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-14">
            Transparent economics, zero middlemen, and payment only on success.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: "No Retainers",
                desc: "Bid what a story is worth to you. Keep total control of spend.",
              },
              {
                title: "Pay on Publication",
                desc: "If you're not quoted, you're not charged. Simple.",
              },
              {
                title: "Live Market Pricing",
                desc: "Our AI engine adjusts price by demand, deadline and yield data.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-gray-50 border border-gray-100 rounded-lg p-8 shadow-sm"
              >
                <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                <p className="text-gray-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— HOW IT WORKS ——— */}
      <section
        id="how-it-works"
        className="relative z-20 bg-gradient-to-b from-white to-gray-50 py-24"
      >
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-center mb-16">
            How It Works
          </h2>

          <ol className="space-y-20">
            {[
              {
                step: "1",
                title: "Browse Expiring Editorial Requests",
                copy: "We curate live journalist requests with hard deadlines. No press-release spam.",
              },
              {
                step: "2",
                title: "Submit a Silent Bid",
                copy: "Bid what you'd pay if you're quoted. Reporters retain full editorial control.",
              },
              {
                step: "3",
                title: "Our AI Finds the Market Rate",
                copy: "Pricing shifts in real time by deadline decay, bid depth, and outlet yield history.",
              },
              {
                step: "4",
                title: "Only Pay if You're Published",
                copy: "Your card is billed the final bid price only when your quote appears live.",
              },
            ].map((s, i) => (
              <li
                key={s.step}
                className={`flex flex-col md:flex-row ${
                  i % 2 ? "md:flex-row-reverse" : ""
                } items-center gap-12`}
              >
                <div className="md:w-1/2">
                  <div className="w-16 h-16 rounded-full bg-[#004684] text-white flex items-center justify-center text-2xl font-bold mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                  <p className="text-gray-600">{s.copy}</p>
                </div>
                <div className="md:w-1/2">
                  {/* Placeholder graphic */}
                  <div className="aspect-video bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center text-[#004684] font-semibold">
                    {s.title}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ——— PRICING BLOCK ——— */}
      <section className="relative z-20 bg-white py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Pricing</h2>
          <p className="text-gray-500 mb-12">
            One simple subscription. Market-based bids only when you win.
          </p>

          <div className="mx-auto max-w-md bg-gray-50 border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-blue-100 px-8 py-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                QuoteBid Access
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-extrabold text-[#004684]">
                  $99.99
                </span>
                <span className="ml-2 text-lg text-gray-700">/month</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Cancel anytime. No contracts.
              </p>
            </div>

            <ul className="px-8 py-10 space-y-5 text-left text-gray-700">
              {[
                "Unlimited access to live editorial requests",
                "Bid as often as you like",
                "Voice + text pitching with AI transcription",
                "Pay only when your quote is published",
              ].map((f) => (
                <li key={f} className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className="px-8 pb-10">
              <Button
                size="lg"
                className="w-full bg-[#004684] text-white hover:bg-[#003a70] py-6 opacity-75 cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Get Marketplace Access
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-20 bg-purple-900 text-purple-100 py-10 text-center text-sm">
        <div className="space-x-6">
          <Link href="/legal/terms">Terms of Use</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/editorial-integrity">Editorial Integrity</Link>
        </div>
        <p className="mt-4">&copy; {new Date().getFullYear()} QuoteBid Inc.</p>
      </footer>
    </div>
    </>
  );
} 