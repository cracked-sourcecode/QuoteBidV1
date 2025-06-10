import { Link } from "wouter";
import { useEffect } from "react";

export default function EditorialIntegrity() {
  /* Reset body opacity on mount and scroll to top */
  useEffect(() => {
    document.body.style.opacity = "1";
    document.body.classList.remove("navigating");
    window.scrollTo(0, 0);
    return () => {
      document.body.style.opacity = "1";
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        {/* Navigation */}
        <header className="relative z-20 w-full py-6 px-6 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center group">
              <span className="text-white font-bold text-2xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
              </span>
            </Link>
            
            <Link 
              href="/"
              className="text-white hover:text-blue-300 transition-colors duration-300 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-20 max-w-4xl mx-auto py-20 px-6">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-8">
                Editorial Integrity Policy
              </h1>
              
              <div className="text-gray-200 space-y-6 text-lg leading-relaxed">
                <p className="text-2xl font-semibold text-blue-300 mb-6">
                  Redefining Access. Preserving Editorial Independence.
                </p>
                
                <p>
                  QuoteBid was created to fundamentally change how earned media access is structured and priced. Our platform introduces a transparent, market-driven model for media visibility — giving qualified experts direct access to editorial opportunities while preserving the full independence of the newsroom.
                </p>
                
                <p>
                  Unlike traditional PR models that rely on retainers, opaque processes, and agency gatekeeping, QuoteBid empowers subject-matter experts to engage directly with live journalist requests — with no interference, compensation, or editorial influence involved.
                </p>
                
                <p className="font-semibold text-white">
                  We are not a PR firm. We are not a publisher. We are not a pay-for-play platform.<br />
                  QuoteBid facilitates access — and nothing more.
                </p>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
                  <p className="mb-4">We are solving two systemic problems in modern PR:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">1. Lack of Price Transparency for Experts and Operators</h3>
                      <p>The traditional PR industry offers no clear cost structure for earned media. Retainers are inflated, deliverables are vague, and the likelihood of placement is often unclear. Experts, founders, and operators are forced to spend without clarity or control.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">2. Unwanted Intermediation and Gatekeeping for Journalists</h3>
                      <p>Journalists are routinely inundated with pitches from PR representatives — often lacking relevance, timeliness, or credibility. Access to real experts is throttled by intermediaries more focused on client servicing than journalistic alignment.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">How QuoteBid Solves This</h2>
                  <p className="mb-4">QuoteBid eliminates the PR firm from the equation. Our platform enables verified experts to pitch directly to reporters — without middlemen, retainers, or editorial filtering.</p>
                  
                  <div className="space-y-2">
                    <p>Journalists maintain full editorial control over what is included.</p>
                    <p>Experts pay only if they are selected and quoted in a published piece.</p>
                    <p>No payment is ever made to journalists or media outlets.</p>
                    <p>We are a marketplace — not a content buyer or editorial participant.</p>
                  </div>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Editorial Safeguards and Platform Policy</h2>
                  <p className="mb-6">QuoteBid is designed to operate in full compliance with ethical journalism standards and media outlet policies. Our platform includes the following safeguards:</p>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-green-400 mb-4">✅ What We Do</h3>
                      <div className="space-y-2 pl-6">
                        <p>Provide real-time access to verified editorial opportunities sourced from live reporter requests</p>
                        <p>Allow subject-matter experts to bid transparently at current market value</p>
                        <p>Deliver pitches directly to journalists without edits, review, or platform-side approval</p>
                        <p>Maintain a strict separation between our pricing engine and any editorial decision-making</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-red-400 mb-4">❌ What We Never Do</h3>
                      <div className="space-y-2 pl-6">
                        <p>We do not pay, incentivize, or otherwise compensate journalists or media outlets — directly or indirectly</p>
                        <p>We do not guarantee publication, promise placement, or sell influence</p>
                        <p>We do not alter, edit, or approve pitch content prior to delivery to the journalist</p>
                        <p>We do not maintain formal affiliations or partnerships with any media outlet, newsroom, or journalist</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">For Journalists</h2>
                  <p className="mb-4">QuoteBid is built to reduce noise — not create more of it. Pitches submitted through our platform come from real, verified experts who submit in their own voice (via text or voice recording) at a live market rate. No PR firms, no ghostwritten quotes.</p>
                  
                  <div className="space-y-2">
                    <p>You receive pitches directly, unfiltered, and without compensation of any kind.</p>
                    <p>You retain full control over what gets included, quoted, or discarded.</p>
                  </div>
                </div>
                
                {/* Back Button */}
                <div className="pt-8 text-center border-t border-white/20">
                  <Link 
                    href="/"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 