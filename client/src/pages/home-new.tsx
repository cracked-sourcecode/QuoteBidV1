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
              price PR coverage in real time—<span className="text-white font-semibold">no retainers, no agencies, and no static prices</span>, 
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
      <section
        id="how-it-works"
        className="relative z-20 bg-gradient-to-b from-purple-900 via-slate-900 to-purple-900 py-16"
      >
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              The Process
            </div>
            <h2 className="text-6xl font-black text-white mb-6">
              How It <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Four simple steps to revolutionize your media strategy
            </p>
          </div>

          <ol className="space-y-24">
            {[
              {
                step: "1",
                title: "Browse Live Editorial Opportunities",
                copy: "A real-time dashboard of active story requests — curated by industry, priced by demand, and driven by deadline.",
              },
              {
                step: "2",
                title: "Place Your Bid to Pitch",
                copy: "Submit your pitch — by voice or text — at the current market rate. By bidding, you agree to pay that price only if you're quoted. Journalists review directly, retain full editorial control, and are never compensated or affiliated with our platform.",
              },
              {
                step: "3",
                title: "We Turned Media Into a Market — And Let the Market Set the Price",
                copy: "We don't set the price — the market does. Our Dynamic Pricing Engine brings true price discovery to PR. It tracks live demand, deadline pressure, and outlet yield to reveal what each story is actually worth to the end consumer — in real time.",
              },
              {
                step: "4",
                title: "Only Pay if You're Published",
                copy: "No retainers. No upfront fees. You're only charged if your pitch is selected and published at the accepted market rate. If you're not quoted — you pay nothing.",
              },
            ].map((s, i) => (
              <li
                key={s.step}
                className={`flex flex-col md:flex-row ${
                  i % 2 ? "md:flex-row-reverse" : ""
                } items-center gap-16`}
              >
                <div className="md:w-1/2">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-3xl font-black mb-6 shadow-2xl">
                    {s.step}
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4 leading-tight">{s.title}</h3>
                  <p className="text-gray-300 text-lg leading-relaxed">{s.copy}</p>
                </div>
                <div className="md:w-1/2">
                  {i === 0 ? (
                    // App Preview for Step 1 - Matching actual app layout
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                      {/* App Header */}
                      <div className="bg-white/10 border-b border-white/20 p-4">
                        <h3 className="text-white font-bold text-lg mb-2">Media Opportunities</h3>
                        <p className="text-gray-300 text-sm">Browse open opportunities from top publications and lock in your bid before prices increase.</p>
                      </div>
                      
                      {/* Single Large Card Preview - Yahoo Finance */}
                      <div className="p-4">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Y</span>
                              </div>
                              <span className="text-white font-bold">Yahoo Finance</span>
                            </div>
                            <div className="px-3 py-1 bg-blue-500 rounded-full text-white text-sm font-medium">Tier 1</div>
                          </div>
                          
                          {/* Expert Request Label */}
                          <div className="mb-3">
                            <span className="text-blue-400 text-sm font-bold uppercase tracking-wide">EXPERT REQUEST</span>
                          </div>
                          
                          {/* Story Title */}
                          <h4 className="text-white text-lg font-bold mb-3 leading-tight">
                            Looking For Capital Market Experts For A Story on eVTOL Stocks
                          </h4>
                          
                          {/* Story Description */}
                          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                            Stock Market Experts — The eVTOL sector is starting to heat up in the public equity market, questions needed are as foll...
                          </p>
                          
                          {/* Tag */}
                          <div className="mb-4">
                            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-400/30">
                              • Capital Markets
                            </span>
                          </div>
                          
                          {/* Price Section */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-gray-400 text-sm">Current Price</p>
                              <p className="text-white text-3xl font-bold">$202</p>
                            </div>
                            <div className="text-right">
                              <span className="text-green-400 text-sm font-medium">📈 +$2 past hour</span>
                            </div>
                          </div>
                          
                          {/* Status Row */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3 text-sm">
                              <span className="text-gray-300">⏰ 8 days left</span>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">🔒 Premium</span>
                            </div>
                            <span className="px-3 py-1 bg-white/10 text-white rounded text-sm border border-white/20">Save Opportunity</span>
                          </div>
                          
                          {/* View Details Button */}
                          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : i === 1 ? (
                    // App Preview for Step 2 - Bidding Interface
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                      {/* Price History Section */}
                      <div className="bg-white/10 border-b border-white/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-bold text-lg">Price History</h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 text-sm font-bold">+$120 (+53.3%)</span>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-300 text-xs">Live Updates</span>
                          </div>
                        </div>
                        
                        {/* Enhanced Price Chart */}
                        <div className="h-24 relative mb-3 bg-white/5 rounded-lg p-2">
                          <svg className="w-full h-full" viewBox="0 0 300 80">
                            <defs>
                              <linearGradient id="priceChart" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
                                <stop offset="50%" stopColor="rgba(34, 197, 94, 0.2)" />
                                <stop offset="100%" stopColor="rgba(34, 197, 94, 0.0)" />
                              </linearGradient>
                              <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge> 
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            
                            {/* Grid lines */}
                            <defs>
                              <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 30 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                            
                            {/* Price line with smooth curves */}
                            <path
                              d="M0,65 Q20,60 40,55 T80,45 Q100,42 120,38 T160,35 Q180,32 200,25 T240,20 Q260,18 280,15 L300,13"
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="2.5"
                              filter="url(#glow)"
                            />
                            
                            {/* Filled area under curve */}
                            <path
                              d="M0,65 Q20,60 40,55 T80,45 Q100,42 120,38 T160,35 Q180,32 200,25 T240,20 Q260,18 280,15 L300,13 L300,80 L0,80 Z"
                              fill="url(#priceChart)"
                            />
                            
                            {/* Data points */}
                            <circle cx="0" cy="65" r="2" fill="#22c55e" opacity="0.8"/>
                            <circle cx="80" cy="45" r="2" fill="#22c55e" opacity="0.8"/>
                            <circle cx="160" cy="35" r="2" fill="#22c55e" opacity="0.8"/>
                            <circle cx="240" cy="20" r="2" fill="#22c55e" opacity="0.8"/>
                            <circle cx="300" cy="13" r="3" fill="#22c55e" className="animate-pulse"/>
                            
                            {/* Current price indicator */}
                            <line x1="300" y1="0" x2="300" y2="80" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
                          </svg>
                          
                          {/* Price labels */}
                          <div className="absolute top-1 left-2 text-green-300 text-xs font-mono">$536</div>
                          <div className="absolute bottom-1 left-2 text-green-300 text-xs font-mono">$144</div>
                          <div className="absolute bottom-1 right-2 text-red-300 text-xs font-mono">$500</div>
                          <div className="absolute top-1 right-2 text-blue-400 text-xs font-bold">NOW: $345</div>
                        </div>
                        
                        {/* Time Filters */}
                        <div className="flex space-x-2">
                          <button className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-400/30">1D</button>
                          <button className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs">3D</button>
                          <button className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs">1W</button>
                        </div>
                      </div>
                      
                      {/* Current Price & Bidding */}
                      <div className="p-4">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300 text-sm">Current Price</span>
                            <span className="text-green-400 text-sm">53% above list price</span>
                          </div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-blue-400 text-4xl font-bold">$345</span>
                            <span className="text-green-400 text-lg">📈 +$120</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-gray-300 text-xs">Dynamic pricing active</span>
                          </div>
                        </div>
                        
                        {/* Pitch Section */}
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-medium">Craft your pitch</span>
                            <span className="text-gray-400 text-xs">2000 characters remaining</span>
                          </div>
                          <div className="bg-white/10 rounded-lg p-3 text-gray-400 text-xs leading-relaxed mb-2">
                            Share your expertise, credentials, and unique perspective that would make you perfect for this story...
                          </div>
                          <button className="flex items-center space-x-2 text-red-400 text-sm">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Record Pitch</span>
                          </button>
                        </div>
                        
                        {/* Submit Button */}
                        <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-xl transition-all mb-2">
                          🔒 Secure Pitch at $345 Live Price
                        </button>
                        <p className="text-gray-400 text-xs text-center">
                          By pitching, you agree to pay the accepted market rate—only if you're included.
                        </p>
                      </div>
                    </div>
                  ) : i === 2 ? (
                    // App Preview for Step 3 - Pricing Engine Dashboard
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300 relative">
                      
                      {/* Header */}
                      <div className="bg-white/10 border-b border-white/20 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-bold text-lg">Engine Analysis</h3>
                            <div className="text-gray-400 text-sm">Real-time pricing computation</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 text-sm">Live</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Main content */}
                      <div className="p-6">
                        
                        {/* Price evolution chart */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white text-sm font-medium">Price Discovery</span>
                            <div className="text-green-400 text-sm">+$65 (+36%)</div>
                          </div>
                          
                          <div className="h-16 bg-white/5 rounded-lg p-3 relative overflow-hidden">
                            <svg width="100%" height="100%" viewBox="0 0 200 40" className="absolute inset-0">
                              <defs>
                                <linearGradient id="priceEvolution" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                                  <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8"/>
                                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.8"/>
                                </linearGradient>
                                <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0"/>
                                </linearGradient>
                              </defs>
                              
                              {/* Chart area fill */}
                              <path d="M10 35 L50 28 L90 22 L130 18 L170 12 L190 8 L190 40 L10 40 Z" fill="url(#chartFill)"/>
                              
                              {/* Price line */}
                              <path d="M10 35 L50 28 L90 22 L130 18 L170 12 L190 8" 
                                    stroke="url(#priceEvolution)" 
                                    strokeWidth="2" 
                                    fill="none"/>
                              
                              {/* Data points */}
                              <circle cx="10" cy="35" r="2" fill="#EF4444"/>
                              <circle cx="90" cy="22" r="2" fill="#F59E0B"/>
                              <circle cx="190" cy="8" r="3" fill="#10B981"/>
                            </svg>
                            
                            {/* Price labels */}
                            <div className="absolute bottom-1 left-2 text-xs text-red-400">$180</div>
                            <div className="absolute top-1 right-2 text-xs text-green-400 font-bold">$245</div>
                          </div>
                        </div>
                        
                        {/* Current metrics */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1">Hours Remaining</div>
                            <div className="text-white text-lg font-bold">47.8</div>
                            <div className="text-orange-400 text-xs">Decay active</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1">Outlet Success Rate</div>
                            <div className="text-white text-lg font-bold">84%</div>
                            <div className="text-blue-400 text-xs">Historical avg</div>
                          </div>
                        </div>
                        
                        {/* Engine output */}
                        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-gray-300 text-sm mb-1">Engine Output</div>
                              <div className="text-white text-2xl font-bold">$245</div>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-300 text-xs">Confidence</div>
                              <div className="text-green-400 text-lg font-bold">94%</div>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  ) : (
                    // App Preview for Step 4 - Success Dashboard
                    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300 relative">
                      
                      {/* Header */}
                      <div className="bg-white/10 border-b border-white/20 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-bold text-lg">Media Coverage</h3>
                            <div className="text-gray-400 text-sm">Your published articles</div>
                          </div>
                          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            8 Published
                          </div>
                        </div>
                      </div>
                      
                      {/* Success notification */}
                      <div className="p-6">
                        <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                            <div>
                              <div className="text-green-400 font-medium">Article Published! 🎉</div>
                              <div className="text-gray-300 text-sm">Payment processed: $245</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Published article */}
                        <div className="bg-white/5 rounded-lg p-4 mb-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">F</div>
                            <div className="flex-1">
                              <div className="text-white font-medium mb-1">Forbes - Capital Market Analysis</div>
                              <div className="text-gray-400 text-sm mb-2">Your expertise on S&P market trends</div>
                              <div className="flex items-center space-x-4">
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Featured</span>
                                <span className="text-blue-400 text-sm font-medium">$245 paid</span>
                              </div>
                            </div>
                            <button className="px-3 py-1 bg-white/10 text-white rounded text-xs hover:bg-white/20">
                              View Article
                            </button>
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-white text-xl font-bold">8</div>
                            <div className="text-gray-400 text-xs">Published</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white text-xl font-bold">$1,847</div>
                            <div className="text-gray-400 text-xs">Total Spent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white text-xl font-bold">92%</div>
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
      <section className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-24 overflow-hidden">
        {/* Animated data flow background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-64 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
          <div className="absolute top-1/2 right-0 w-48 h-px bg-gradient-to-l from-transparent via-purple-400 to-transparent"></div>
          <div className="absolute bottom-1/4 left-1/4 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            
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
                  <div className="absolute top-1/2 left-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="absolute top-1/2 right-4 w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute top-4 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-4 left-1/2 w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  
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
                <div className="absolute top-1/2 -left-8 w-6 h-6 bg-cyan-400/30 rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 -right-8 w-6 h-6 bg-pink-400/30 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— PRICING BLOCK ——— */}
      <section className="relative z-20 bg-gradient-to-b from-slate-900 to-purple-900 py-32">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              Simple Pricing
            </div>
            <h2 className="text-6xl font-black text-white mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              One Simple Subscription. Full marketplace access. Real-time pricing.<br/>
              Pay only when your pitch is placed.
            </p>
          </div>

          <div className="mx-auto max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-10 py-12 border-b border-white/20">
              <h3 className="text-3xl font-black text-white mb-4">
                QuoteBid Access
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-7xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
                  $99.99
                </span>
                <span className="ml-3 text-xl text-gray-300">/month</span>
              </div>
              <p className="text-gray-300 mt-4 text-lg">
                Cancel anytime. No contracts.
              </p>
            </div>

            <div className="px-10 py-12">
              <h4 className="text-white text-xl font-bold mb-8 text-center">What's included:</h4>
              <ul className="space-y-6 text-left">
                {[
                  "Full access to all live media opportunities",
                  "Dynamic pricing — no retainers, no fixed fees",
                  "New opportunities added daily",
                  "Interactive market chart with live price updates",
                  "Track pitch status and history",
                  "Record and submit pitches with your voice",
                  "Fast, minimal UI built for professionals",
                ].map((f) => (
                <li key={f} className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-4 mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-white text-lg leading-relaxed">{f}</span>
                </li>
              ))}
              </ul>
            </div>

            <div className="px-10 pb-12">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold hover:from-purple-600 hover:to-violet-700 py-8 text-xl rounded-2xl shadow-2xl opacity-75 cursor-not-allowed transition-all duration-300"
                onClick={(e) => e.preventDefault()}
              >
                Get Marketplace Access
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-20 bg-gradient-to-b from-purple-900 to-slate-900 py-16">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center group">
              <span className="text-white font-black text-4xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
              </span>
              <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                Beta
              </div>
            </Link>
            <p className="text-gray-400 mt-4 text-lg">
              The world's first live marketplace for earned media
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <Link 
              href="/legal/terms" 
              className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
            >
              Terms of Use
            </Link>
            <Link 
              href="/legal/privacy" 
              className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
            >
              Privacy
            </Link>
            <Link 
              href="/legal/editorial-integrity" 
              className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
            >
              Editorial Integrity
            </Link>
          </div>
          
          <div className="border-t border-white/20 pt-8">
            <p className="text-gray-400 text-lg">
              &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Built for experts, not PR agencies.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
} 