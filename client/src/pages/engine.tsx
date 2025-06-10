import { Link } from "wouter";
import { useEffect } from "react";

export default function PricingEngine() {
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
                Pricing Engine Overview
              </h1>
              
              <div className="text-gray-200 space-y-6 text-lg leading-relaxed">
                <p className="text-2xl font-semibold text-blue-300 mb-6">
                  How QuoteBid Introduces Price Discovery to Earned Media
                </p>
                
                <p>
                  QuoteBid was created to address a long-standing inefficiency in the public relations industry: the absence of a transparent, market-based pricing model for earned media access.
                </p>
                
                <p>
                  For decades, individuals and businesses seeking media coverage have been required to engage PR firms—often under flat retainers, hourly billing, or static per placement fees. These pricing models rarely correlate to the actual value of the coverage being pursued and are typically determined without reference to market demand, outlet value, or timing.
                </p>
                
                <p>
                  QuoteBid's Pricing Engine is designed to resolve this problem by introducing a real-time, demand-based pricing framework that reflects true market behavior. It allows experts to engage directly with media opportunities and enables journalists to receive relevant, high-quality pitches without intermediary friction.
                </p>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">The Problem</h2>
                  <p className="mb-4">The traditional PR agency model functions as an intermediary between experts and journalists. While this model once provided value through managed outreach and reputation-building, it has grown increasingly misaligned with the way modern media functions:</p>
                  
                  <div className="space-y-2 pl-6">
                    <p>• Pricing is static, regardless of outcome</p>
                    <p>• Access is routed through third parties with misaligned incentives</p>
                    <p>• In many cases, Experts pay regardless of success</p>
                    <p>• Journalists receive high volumes of irrelevant, non-vetted pitches</p>
                  </div>
                  
                  <p className="mt-4">As a result, media access remains costly, inefficient, and opaque for the expert—and frustratingly noisy for the journalist.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Our Solution</h2>
                  <p className="mb-4">The QuoteBid Pricing Engine is a real-time, algorithmically governed system that determines the live access price to each editorial opportunity on the platform.</p>
                  
                  <p className="mb-4">Rather than charging retainers or setting static fees, our engine calculates a market-informed price per opportunity using live platform activity and historical data. This enables transparent pricing that reflects demand, urgency, and outlet reputation.</p>
                  
                  <p>Once a pitch is submitted, the price is locked for that user—but they are only charged if their quote is selected and included in the published story.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Tiered Opportunity Structure</h2>
                  <p className="mb-6">All opportunities on QuoteBid are organized into a three-tier framework, designed to set clear expectations and create structured entry points for bids:</p>
                  
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10 overflow-x-auto">
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 font-semibold">Tier</th>
                          <th className="text-left py-3 font-semibold">Outlet Type</th>
                          <th className="text-left py-3 font-semibold">Starting Price (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-2">
                        <tr className="border-b border-white/10">
                          <td className="py-3 font-medium">1</td>
                          <td className="py-3">Major national publications</td>
                          <td className="py-3 font-bold text-green-400">$225</td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="py-3 font-medium">2</td>
                          <td className="py-3">Mid-tier digital or trade outlets</td>
                          <td className="py-3 font-bold text-blue-400">$175</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-medium">3</td>
                          <td className="py-3">Niche, vertical, or local outlets</td>
                          <td className="py-3 font-bold text-purple-400">$125</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="mt-4">Each opportunity begins at its assigned tier baseline. The final access price may rise or fall depending on live market activity, including bid volume and time remaining until deadline.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">How Pricing Works</h2>
                  <p className="mb-4">The engine calculates price based on a combination of:</p>
                  
                  <div className="space-y-2 pl-6 mb-4">
                    <p>• User interest and pitch volume</p>
                    <p>• Time decay (proximity to editorial deadline)</p>
                    <p>• Engagement indicators (clicks, saves, and drafts)</p>
                    <p>• Historical pricing averages per outlet</p>
                  </div>
                  
                  <p className="mb-4">These variables are processed using platform-defined logic and QuoteBid's Agentic SDK, which interprets input data and updates pricing on a continuous basis. Prices are adjusted at the system level—never individually or manually.</p>
                  
                  <p>Once a user submits a pitch, they agree to the current market price displayed. That price is only charged if the pitch is accepted and the quote appears in the final publication. If the user is not selected, no charge is applied.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Platform Controls and Safeguards</h2>
                  <p className="mb-4">QuoteBid does not manually alter the price of individual opportunities. However, the company retains administrative discretion to:</p>
                  
                  <div className="space-y-2 pl-6 mb-4">
                    <p>• Set global pricing floors and ceilings per tier</p>
                    <p>• Adjust algorithmic weighting to reflect platform health or behavior shifts</p>
                    <p>• Reclassify outlets between tiers as needed</p>
                    <p>• Introduce new inputs to improve pricing accuracy</p>
                  </div>
                  
                  <p>All such actions are applied consistently across the platform and governed by internal pricing protocols.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Editorial Independence</h2>
                  <p className="mb-4">QuoteBid does not engage in any form of editorial involvement or influence. To protect the independence of the media process:</p>
                  
                  <div className="space-y-2 pl-6 mb-4">
                    <p>• Journalists are not compensated or incentivized</p>
                    <p>• Editorial selection remains fully at the discretion of the reporter</p>
                    <p>• Pricing governs access to submit—not the decision to include</p>
                  </div>
                  
                  <p>This structure ensures a clear separation between marketplace mechanics and editorial outcomes.</p>
                </div>

                <div className="pt-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Why This Model Matters</h2>
                  <p className="mb-4">By introducing price discovery into earned media, QuoteBid allows for:</p>
                  
                  <div className="space-y-2 pl-6 mb-4">
                    <p>• Transparent pricing that reflects current demand</p>
                    <p>• Outcome-based participation—users pay only when coverage is secured</p>
                    <p>• Reduced friction for journalists sourcing subject-matter expertise</p>
                    <p>• Elimination of the agency as a pricing intermediary</p>
                  </div>
                  
                  <p className="mb-4 font-semibold text-blue-300">The market already existed—we simply brought it to life and made it transparent.</p>
                  
                  <p>This model enables a more efficient and equitable system for media access—benefiting both experts seeking visibility and journalists seeking expert insight.</p>
                </div>
                
                {/* Back Button */}
                <div className="pt-8 text-center border-t border-white/20">
                  <Link 
                    href="/home-test"
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