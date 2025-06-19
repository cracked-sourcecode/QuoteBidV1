import React, { useState, useEffect } from 'react';
import { Link } from "wouter";

export default function PrivacyPolicy() {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
        <main className="relative z-20 max-w-5xl mx-auto py-12 px-6">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-6 text-center">
                QuoteBid Privacy Policy
              </h1>
              
              <p className="text-center text-blue-300 mb-12 text-lg">
                Last updated: <span className="font-semibold text-white">June 18, 2025</span>
              </p>
              
              <div className="text-gray-200 space-y-10 text-base leading-relaxed">
                {/* Intro */}
                <section>
                  <p className="mb-4">This Privacy Policy describes how <span className="font-semibold text-white">Rubicon PR Group LLC</span> ("Rubicon," "we," "us," or "our") collects, uses, and protects your information in connection with your use of QuoteBid — our proprietary PR bidding and pricing platform (the "Platform").</p>
                  <p>By accessing or using the Platform, you consent to the practices described below.</p>
                </section>

                {/* Section 1 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">1. Who We Are</h2>
                  <p><span className="font-semibold text-white">Rubicon PR Group LLC</span> is the legal owner and operator of QuoteBid. All data collected through the Platform is processed and maintained by Rubicon in accordance with this policy and applicable law.</p>
                </section>

                {/* Section 2 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">2. Information We Collect</h2>
                  <p className="mb-4">We collect both personal and usage-based information:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">a. Account & Profile Data</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Name, email, password</li>
                        <li>Industry, professional credentials, bio content</li>
                        <li>User-submitted pitches, drafts, preferences</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">b. Transactional Data</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Payment details (via Stripe)</li>
                        <li>Invoice records, billing history</li>
                        <li>Placement history and activity</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">c. Behavioral & Engagement Data</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Opportunities clicked, viewed, saved</li>
                        <li>Draft behavior and pitch status changes</li>
                        <li>Dynamic pricing interactions and time-based events</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">d. Device & Technical Data</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>IP address, device type, browser fingerprint</li>
                        <li>Access logs, session duration, error reports</li>
                        <li>Referral sources and page navigation paths</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">e. Communication Records</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>System-generated emails and alerts</li>
                        <li>Support tickets and feedback submissions</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">3. How We Use Your Data</h2>
                  <p className="mb-4">We use your information to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Deliver core functionality of the Platform</li>
                    <li>Operate our dynamic pricing engine and AI bidding agent</li>
                    <li>Personalize opportunity alerts and user experience</li>
                    <li>Process secure transactions via Stripe</li>
                    <li>Monitor system performance, fraud, and abuse</li>
                    <li>Generate anonymized internal reporting and demand trends</li>
                  </ul>
                  <p className="mt-4"><span className="font-semibold text-white">Certain behaviors</span> (e.g., clicks, saves, pitch volume) directly inform live pricing adjustments.</p>
                </section>

                {/* Section 4 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">4. Legal Basis for Processing</h2>
                  <p className="mb-4">We process your data based on:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Your consent (when creating an account)</li>
                    <li>Contractual necessity (e.g., delivering paid services)</li>
                    <li>Our legitimate interest in maintaining a secure, intelligent, and efficient platform</li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">5. Third-Party Services</h2>
                  <p className="mb-4">We may share necessary data with:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><span className="font-semibold text-white">Stripe</span> – for secure payment processing</li>
                    <li><span className="font-semibold text-white">Resend / Email Services</span> – for transactional communications</li>
                    <li><span className="font-semibold text-white">OpenAI / LLM APIs</span> – for AI agent decision-making (non-identifiable signals only)</li>
                    <li><span className="font-semibold text-white">Hosting/Infrastructure providers</span> – e.g., Render, Neon, Cloudflare</li>
                  </ul>
                  <p className="mt-4 font-semibold text-white">We do not sell or rent your personal data.</p>
                </section>

                {/* Section 6 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">6. Cookies & Analytics</h2>
                  <p className="mb-4">We use cookies and session-based tracking to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Measure engagement</li>
                    <li>Monitor opportunity demand</li>
                    <li>Improve platform navigation</li>
                  </ul>
                  <p className="mt-4">You can control cookie behavior via your browser settings.</p>
                </section>

                {/* Section 7 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">7. Data Retention</h2>
                  <p className="mb-4">We retain your data as long as your account is active and for any period required to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Meet legal/regulatory obligations</li>
                    <li>Maintain historical price yield accuracy</li>
                    <li>Improve product functionality and intelligence</li>
                  </ul>
                  <p className="mt-4">Upon account deletion, your personally identifiable data is removed or anonymized within <span className="font-semibold text-white">30 days</span>.</p>
                </section>

                {/* Section 8 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">8. Your Rights</h2>
                  <p className="mb-4">You may request to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access, correct, or delete your data</li>
                    <li>Opt-out of non-essential tracking</li>
                    <li>Export your profile and pitch history</li>
                  </ul>
                  <p className="mt-4">To submit a request, email: <span role="img" aria-label="email">📧</span> <a href="mailto:privacy@quotebid.com" className="text-blue-400 underline hover:text-blue-300">privacy@quotebid.com</a></p>
                </section>

                {/* Section 9 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">9. Security Measures</h2>
                  <p className="mb-4">We implement:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Encrypted data transmission (TLS)</li>
                    <li>Role-based access control</li>
                    <li>Secure credential storage</li>
                    <li>API and webhook authentication</li>
                  </ul>
                  <p className="mt-4">No system is impenetrable, but we continuously work to protect your information.</p>
                </section>

                {/* Section 10 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">10. International Users</h2>
                  <p>Your data may be stored and processed in the <span className="font-semibold text-white">United States</span>. By using the Platform, you acknowledge and agree to cross-border data transfer and processing under U.S. law.</p>
                </section>

                {/* Section 11 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">11. Policy Changes</h2>
                  <p>We may update this policy periodically. Material changes will be communicated via email or prominent in-app notice.</p>
                </section>

                {/* Section 12 */}
                <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">12. Contact</h2>
                  <p>
                    <span className="font-semibold text-white">Rubicon PR Group LLC</span><br />
                    Legal + Compliance Division<br />
                    <span role="img" aria-label="email">📧</span> <a href="mailto:privacy@quotebid.com" className="text-blue-400 underline hover:text-blue-300">privacy@quotebid.com</a>
                  </p>
                </section>

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