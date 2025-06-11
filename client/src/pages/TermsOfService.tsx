import React, { useState, useEffect } from 'react';
import { Link } from "wouter";

export default function TermsOfService() {
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
                QuoteBid Terms of Service
              </h1>
              
              <p className="text-center text-blue-300 mb-12 text-lg">
                Effective Date: <span className="font-semibold text-white">May 23rd, 2025</span>
              </p>
              
              <div className="text-gray-200 space-y-10 text-base leading-relaxed">
          {/* Section 0: Intro */}
          <section>
                  <p className="mb-4">These Terms of Service ("Terms") constitute a binding legal agreement between you ("you," "User," or "Client") and <span className="font-semibold text-white">Rubicon PR Group LLC</span>, a Delaware limited liability company ("Provider," "we," or "us"), which owns and operates the <span className="font-semibold text-white">QuoteBid</span> platform ("Platform"). By accessing or using the Platform, you agree to be legally bound by these Terms.</p>
          </section>

          {/* Section 1 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">1. Acceptance & Scope</h2>
                  <p>By accessing, registering for, or using the Platform, you represent and warrant that you have read, understood, and agree to comply with these Terms. These Terms govern all use of the Platform, regardless of the device or interface used.</p>
          </section>

          {/* Section 2 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">2. Eligibility</h2>
                  <p>You must be at least 18 years old and legally able to enter into contracts. If you are using the Platform on behalf of an entity, you represent and warrant that you are authorized to bind that entity to these Terms.</p>
          </section>

          {/* Section 3 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">3. Subscription & Payment</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access to the Platform requires payment of a <span className="font-semibold text-white">$99.99/month</span> subscription, billed automatically.</li>
              <li>All payments are final and non-refundable, including payments for Successful Bids, unless required by applicable law.</li>
              <li>Subscription fees and bid-related fees are payable exclusively to Provider. No portion constitutes compensation to journalists or media outlets.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">4. User Responsibilities</h2>
                  <ul className="list-disc pl-6 space-y-2">
              <li>Maintain accurate account information;</li>
              <li>Keep your credentials secure;</li>
              <li>Use the Platform in compliance with all applicable laws and these Terms;</li>
              <li>Assume full responsibility for any content you submit or actions taken through your account.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">5. Confidentiality & Non-Circumvention</h2>
                  <p className="mb-4">You agree not to disclose, repurpose, or externally use any confidential data obtained through the Platform, including journalist queries, pricing data, and algorithmic insights.</p>
                  <p>You may not circumvent the Platform by contacting, soliciting, or transacting with any journalist or outlet introduced through the Platform for a period of twelve (12) months following your last login or last Successful Bid—whichever is later.</p>
          </section>

          {/* Section 6 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">6. Platform Ownership & License</h2>
                  <p className="mb-4">The Platform, including its source code, data models, AI logic, user interfaces, APIs, and content, is the exclusive property of Rubicon PR Group LLC.</p>
                  <p>You are granted a limited, non-transferable license to access and use the Platform solely for its intended purpose. No license or ownership rights are granted to you by implication or otherwise.</p>
          </section>

          {/* Section 7 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">7. Acceptable Use Policy</h2>
                  <p className="mb-4">You may not:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>Interfere with the Platform's operation, access systems without authorization, or transmit malware;</li>
              <li>Scrape, crawl, reproduce, or exploit the Platform for commercial gain outside its intended use;</li>
              <li>Submit misleading, infringing, or unlawful content;</li>
              <li>Use the Platform in violation of U.S. export laws or in jurisdictions subject to U.S. sanctions.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">8. Privacy & Data Security</h2>
                  <p className="mb-4">We collect and use your information in accordance with our Privacy Policy, which is incorporated by reference.</p>
                  <p className="mb-4">You understand that:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>Data is processed in the United States;</li>
              <li>We use commercially reasonable efforts to secure user data;</li>
              <li>No system is entirely immune to breach, and you assume all risk associated with transmitting data online.</li>
            </ul>
                  <p>If we become aware of a security incident affecting your personal data, we will notify you in accordance with applicable law.</p>
          </section>

          {/* Section 9 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">9. Third-Party Services</h2>
                  <p>The Platform may rely on or integrate with third-party services (e.g., Stripe, Google). We make no warranties regarding and assume no liability for any issues arising from third-party platforms. Your use of those services is governed by their own terms.</p>
          </section>

          {/* Section 10 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">10. Editorial Independence</h2>
                  <p>Rubicon PR Group LLC has no editorial control over journalists or publications. We do not guarantee coverage, placement, or specific outcomes. Bids are opportunity fees—not bribes, commissions, or pay-for-play incentives.</p>
          </section>

          {/* Section 11 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">11. Platform Changes & Availability</h2>
                  <p className="mb-4">We reserve the right to modify, suspend, or discontinue the Platform (in whole or in part) at any time, with or without notice.</p>
                  <p>We are not liable for any service interruptions, delays, or losses caused by downtime, maintenance, force majeure, cyberattacks, or third-party failures.</p>
          </section>

          {/* Section 12 */}
          <section>
                  <h2 className="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">12. Disclaimer of Warranties</h2>
                  <p className="mb-4 font-semibold uppercase tracking-wide text-red-300">THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE."</p>
                  <p className="mb-4">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>MERCHANTABILITY;</li>
              <li>FITNESS FOR A PARTICULAR PURPOSE;</li>
              <li>ACCURACY OR COMPLETENESS;</li>
              <li>NON-INFRINGEMENT;</li>
              <li>SYSTEM SECURITY OR UPTIME;</li>
              <li>SUITABILITY FOR YOUR INTENDED RESULTS.</li>
            </ul>
          </section>

          {/* Section 13 */}
          <section>
                  <h2 className="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">13. Limitation of Liability</h2>
                  <p className="mb-4">TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, LOST DATA, INTERRUPTION OF SERVICE, OR FAILURE OF PERFORMANCE.</p>
                  <p className="mb-4">IN ALL CASES, OUR MAXIMUM AGGREGATE LIABILITY SHALL NOT EXCEED THE GREATER OF:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>$300 USD, or</li>
              <li>The total amount you paid us in the three (3) months preceding the claim.</li>
            </ul>
          </section>

          {/* Section 14 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">14. Indemnification</h2>
                  <p className="mb-4">You agree to indemnify, defend, and hold harmless Rubicon PR Group LLC and its affiliates from any claims, damages, liabilities, losses, costs, or expenses (including legal fees) arising from:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Platform;</li>
              <li>Your violation of these Terms;</li>
              <li>Your submitted content or interactions;</li>
              <li>Any breach of applicable laws.</li>
            </ul>
          </section>

          {/* Section 15 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">15. Dispute Resolution & Arbitration</h2>
                  <p className="mb-4">All disputes will be resolved exclusively by binding arbitration administered by JAMS under its Comprehensive Arbitration Rules.</p>
                  <p className="mb-4"><span className="font-semibold text-white">Venue:</span> New York, New York</p>
                  <p className="mb-4">No class actions, consolidated proceedings, or jury trials permitted.</p>
                  <p>The prevailing party may recover attorneys' fees and costs.</p>
          </section>

          {/* Section 16 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">16. Modifications</h2>
                  <p>We may revise these Terms at any time. Revised versions take effect when posted unless stated otherwise. Your continued use of the Platform constitutes acceptance of any updates.</p>
          </section>

          {/* Section 17 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">17. Termination</h2>
                  <p className="mb-4">We may suspend or terminate your access to the Platform at our sole discretion, without notice, if:</p>
                  <ul className="list-disc pl-6 space-y-2">
              <li>You breach these Terms;</li>
              <li>Your use harms the Platform, its users, or our business interests;</li>
              <li>Your activity violates any applicable law or regulation.</li>
            </ul>
                  <p>All license rights cease upon termination. Sections 5–17 survive.</p>
          </section>

          {/* Section 18 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">18. Governing Law</h2>
                  <p>These Terms are governed by the laws of the State of New York, excluding its conflict-of-law rules.</p>
          </section>

          {/* Section 19 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">19. Entire Agreement</h2>
                  <p>These Terms, along with any referenced documents (e.g., Privacy Policy), constitute the entire agreement between you and Rubicon PR Group LLC concerning the Platform. They supersede all prior agreements, communications, and representations.</p>
          </section>

          {/* Section 20 */}
          <section>
                  <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2">20. Contact</h2>
                  <p>All legal notices and inquiries should be directed to:<br />
                    <span role="img" aria-label="email">📧</span> <a href="mailto:legal@quotebid.co" className="text-blue-400 underline hover:text-blue-300">legal@quotebid.co</a>
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