import React, { useState } from 'react';

export default function TermsOfService() {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#7B5FFF] to-[#3B267A] py-12 px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-10 md:p-14 overflow-y-auto" style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-[#7B5FFF] tracking-tight">QuoteBid Terms of Service</h1>
        <p className="text-center text-gray-500 mb-10 text-base md:text-lg">Effective Date: <span className="font-semibold text-[#3B267A]">May 23rd, 2025</span></p>
        <div className="space-y-10">
          {/* Section 0: Intro */}
          <section>
            <p className="text-gray-700 text-base leading-relaxed mb-2">These Terms of Service (“Terms”) constitute a binding legal agreement between you (“you,” “User,” or “Client”) and <span className="font-semibold">Rubicon PR Group LLC</span>, a Delaware limited liability company (“Provider,” “we,” or “us”), which owns and operates the <span className="font-semibold">QuoteBid</span> platform (“Platform”). By accessing or using the Platform, you agree to be legally bound by these Terms.</p>
          </section>
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">1. Acceptance & Scope</h2>
            <p className="text-gray-700 text-base leading-relaxed">By accessing, registering for, or using the Platform, you represent and warrant that you have read, understood, and agree to comply with these Terms. These Terms govern all use of the Platform, regardless of the device or interface used.</p>
          </section>
          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">2. Eligibility</h2>
            <p className="text-gray-700 text-base leading-relaxed">You must be at least 18 years old and legally able to enter into contracts. If you are using the Platform on behalf of an entity, you represent and warrant that you are authorized to bind that entity to these Terms.</p>
          </section>
          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">3. Subscription & Payment</h2>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>Access to the Platform requires payment of a <span className="font-semibold">$99.99/month</span> subscription, billed automatically.</li>
              <li>All payments are final and non-refundable, including payments for Successful Bids, unless required by applicable law.</li>
              <li>Subscription fees and bid-related fees are payable exclusively to Provider. No portion constitutes compensation to journalists or media outlets.</li>
            </ul>
          </section>
          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">4. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>Maintain accurate account information;</li>
              <li>Keep your credentials secure;</li>
              <li>Use the Platform in compliance with all applicable laws and these Terms;</li>
              <li>Assume full responsibility for any content you submit or actions taken through your account.</li>
            </ul>
          </section>
          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">5. Confidentiality & Non-Circumvention</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">You agree not to disclose, repurpose, or externally use any confidential data obtained through the Platform, including journalist queries, pricing data, and algorithmic insights.</p>
            <p className="text-gray-700 text-base leading-relaxed">You may not circumvent the Platform by contacting, soliciting, or transacting with any journalist or outlet introduced through the Platform for a period of twelve (12) months following your last login or last Successful Bid—whichever is later.</p>
          </section>
          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">6. Platform Ownership & License</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">The Platform, including its source code, data models, AI logic, user interfaces, APIs, and content, is the exclusive property of Rubicon PR Group LLC.</p>
            <p className="text-gray-700 text-base leading-relaxed">You are granted a limited, non-transferable license to access and use the Platform solely for its intended purpose. No license or ownership rights are granted to you by implication or otherwise.</p>
          </section>
          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">7. Acceptable Use Policy</h2>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>Interfere with the Platform's operation, access systems without authorization, or transmit malware;</li>
              <li>Scrape, crawl, reproduce, or exploit the Platform for commercial gain outside its intended use;</li>
              <li>Submit misleading, infringing, or unlawful content;</li>
              <li>Use the Platform in violation of U.S. export laws or in jurisdictions subject to U.S. sanctions.</li>
            </ul>
          </section>
          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">8. Privacy & Data Security</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">We collect and use your information in accordance with our Privacy Policy, which is incorporated by reference.</p>
            <p className="text-gray-700 text-base leading-relaxed mb-2">You understand that:</p>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>Data is processed in the United States;</li>
              <li>We use commercially reasonable efforts to secure user data;</li>
              <li>No system is entirely immune to breach, and you assume all risk associated with transmitting data online.</li>
            </ul>
            <p className="text-gray-700 text-base leading-relaxed">If we become aware of a security incident affecting your personal data, we will notify you in accordance with applicable law.</p>
          </section>
          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">9. Third-Party Services</h2>
            <p className="text-gray-700 text-base leading-relaxed">The Platform may rely on or integrate with third-party services (e.g., Stripe, Google). We make no warranties regarding and assume no liability for any issues arising from third-party platforms. Your use of those services is governed by their own terms.</p>
          </section>
          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">10. Editorial Independence</h2>
            <p className="text-gray-700 text-base leading-relaxed">Rubicon PR Group LLC has no editorial control over journalists or publications. We do not guarantee coverage, placement, or specific outcomes. Bids are opportunity fees—not bribes, commissions, or pay-for-play incentives.</p>
          </section>
          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">11. Platform Changes & Availability</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">We reserve the right to modify, suspend, or discontinue the Platform (in whole or in part) at any time, with or without notice.</p>
            <p className="text-gray-700 text-base leading-relaxed">We are not liable for any service interruptions, delays, or losses caused by downtime, maintenance, force majeure, cyberattacks, or third-party failures.</p>
          </section>
          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">12. Disclaimer of Warranties</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2 font-semibold uppercase tracking-wide">THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE."</p>
            <p className="text-gray-700 text-base leading-relaxed mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:</p>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
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
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">13. Limitation of Liability</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, LOST DATA, INTERRUPTION OF SERVICE, OR FAILURE OF PERFORMANCE.</p>
            <p className="text-gray-700 text-base leading-relaxed mb-2">IN ALL CASES, OUR MAXIMUM AGGREGATE LIABILITY SHALL NOT EXCEED THE GREATER OF:</p>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>$300 USD, or</li>
              <li>The total amount you paid us in the three (3) months preceding the claim.</li>
            </ul>
          </section>
          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">14. Indemnification</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">You agree to indemnify, defend, and hold harmless Rubicon PR Group LLC and its affiliates from any claims, damages, liabilities, losses, costs, or expenses (including legal fees) arising from:</p>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>Your use of the Platform;</li>
              <li>Your violation of these Terms;</li>
              <li>Your submitted content or interactions;</li>
              <li>Any breach of applicable laws.</li>
            </ul>
          </section>
          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">15. Dispute Resolution & Arbitration</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">All disputes will be resolved exclusively by binding arbitration administered by JAMS under its Comprehensive Arbitration Rules.</p>
            <p className="text-gray-700 text-base leading-relaxed mb-2"><span className="font-semibold">Venue:</span> New York, New York</p>
            <p className="text-gray-700 text-base leading-relaxed mb-2">No class actions, consolidated proceedings, or jury trials permitted.</p>
            <p className="text-gray-700 text-base leading-relaxed">The prevailing party may recover attorneys' fees and costs.</p>
          </section>
          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">16. Modifications</h2>
            <p className="text-gray-700 text-base leading-relaxed">We may revise these Terms at any time. Revised versions take effect when posted unless stated otherwise. Your continued use of the Platform constitutes acceptance of any updates.</p>
          </section>
          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">17. Termination</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-2">We may suspend or terminate your access to the Platform at our sole discretion, without notice, if:</p>
            <ul className="list-disc pl-6 text-gray-700 text-base leading-relaxed space-y-1">
              <li>You breach these Terms;</li>
              <li>Your use harms the Platform, its users, or our business interests;</li>
              <li>Your activity violates any applicable law or regulation.</li>
            </ul>
            <p className="text-gray-700 text-base leading-relaxed">All license rights cease upon termination. Sections 5–17 survive.</p>
          </section>
          {/* Section 18 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">18. Governing Law</h2>
            <p className="text-gray-700 text-base leading-relaxed">These Terms are governed by the laws of the State of New York, excluding its conflict-of-law rules.</p>
          </section>
          {/* Section 19 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">19. Entire Agreement</h2>
            <p className="text-gray-700 text-base leading-relaxed">These Terms, along with any referenced documents (e.g., Privacy Policy), constitute the entire agreement between you and Rubicon PR Group LLC concerning the Platform. They supersede all prior agreements, communications, and representations.</p>
          </section>
          {/* Section 20 */}
          <section>
            <h2 className="text-2xl font-bold text-[#5B6EE1] mb-2 mt-6 border-b border-gray-200 pb-1">20. Contact</h2>
            <p className="text-gray-700 text-base leading-relaxed">All legal notices and inquiries should be directed to:<br />
              <span role="img" aria-label="email">📧</span> <a href="mailto:legal@quotebid.co" className="text-[#7B5FFF] underline">legal@quotebid.co</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
} 