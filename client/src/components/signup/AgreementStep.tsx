import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import { advanceSignupStage, getSignupEmail, storeSignupName } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { useToast } from "@/hooks/use-toast";
import SignatureCanvas from 'react-signature-canvas';

interface AgreementStepProps {
  onComplete: () => void;
}

export function AgreementStep({ onComplete }: AgreementStepProps) {
  const { toast } = useToast();
  const { refreshStage, setStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);
  const email = getSignupEmail();
  const agreementContentRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [canSign, setCanSign] = useState(false);

  useEffect(() => {
    setStage('agreement'); // Ensure progress bar is on step 1
  }, [setStage]);

  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
  };

  const isSignatureEmpty = () => {
    return sigRef.current?.isEmpty() || false;
  };

  // Scroll handler for agreement content
  const handleAgreementScroll = () => {
    const el = agreementContentRef.current;
    if (el) {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
      setScrolledToBottom(atBottom);
      setCanSign(atBottom);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!fullName.trim() || fullName.length < 3) {
        toast({
          title: 'Full Name Required',
          description: 'Please enter your full legal name before continuing.',
          variant: 'destructive',
        });
        return;
      }
      if (!hasAgreed) {
        toast({
          title: 'Agreement Required',
          description: 'Please confirm that you agree to the terms.',
          variant: 'destructive',
        });
        return;
      }
      if (isSignatureEmpty()) {
        toast({
          title: 'Signature Required',
          description: 'Please sign the agreement before continuing.',
          variant: 'destructive',
        });
        return;
      }
      setIsLoading(true);
      // Store the name for later use
      storeSignupName(fullName);
      // Get signature as data URL
      const signature = sigRef.current?.toDataURL();
      // Get current timestamp
      const signedAt = new Date().toISOString();
      // Fetch public IP address
      let ipAddress = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ipAddress = data.ip;
      } catch (err) {
        ipAddress = 'unavailable';
      }
      // Store agreement data in localStorage
      localStorage.setItem('signup_agreement', JSON.stringify({ fullName, signature, signedAt, ipAddress }));
      toast({
        title: 'Agreement Accepted',
        description: 'You have successfully signed the agreement.',
      });
      onComplete();
    } catch (error) {
      console.error('Error submitting agreement:', error);
      toast({
        title: 'Submission Error',
        description: 'There was an error submitting your agreement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const agreementHtml = `
    <h1 style="text-align:center; margin-bottom: 0.5em;"><strong>Platform Access Agreement</strong></h1>
    <p style="line-height:1.8;"><strong>Effective Date:</strong> Upon Acceptance by User<br/>
    <strong>Provider:</strong> Rubicon PR Group LLC, a Delaware Limited Liability Company ("Provider")<br/>
    <strong>User:</strong> The individual or entity accessing the platform ("Client," "User," or "You")</p>
    <hr/>
    <h2 style="margin-top:1.5em;">1. Introduction</h2>
    <p style="line-height:1.8;">This Platform Access Agreement ("<strong>Agreement</strong>") governs the terms under which <strong>You</strong> access and use the proprietary PR bidding platform operated by <strong>Rubicon PR Group LLC</strong> (the "Provider"). By clicking <strong>"I Agree,"</strong> creating an account, or making payment, <strong>You</strong> agree to be legally bound by this Agreement.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">2. Access & Subscription</h2>
    <h3 style="margin-top:1em;">2.1 Platform Use</h3>
    <p style="line-height:1.8;">The Provider offers a digital marketplace allowing qualified users to view and respond to real media opportunities by submitting editorial pitches and placing monetary bids for consideration.</p>
    <h3 style="margin-top:1em;">2.2 Monthly Subscription Fee</h3>
    <p style="line-height:1.8;">A recurring fee of <strong>$99.99 per month</strong> grants You access to the Platform's media-request database and the ability to submit bids. <em>This fee is non-refundable.</em></p>
    <h3 style="margin-top:1em;">2.3 Bidding Model</h3>
    <p style="line-height:1.8;">You may place a monetary bid in connection with a specific journalist's query. <strong>You will only be charged</strong> the bid amount <strong>if</strong> your pitch is selected and successfully published by the journalist or outlet.</p>
    <h3 style="margin-top:1em;">2.4 Fees Go to Provider Only</h3>
    <p style="line-height:1.8;">All fees collected via the Platform—including subscription fees and successful bid fees—are payable <strong>solely to the Provider</strong>. No portion of any fee is paid to journalists, publishers, or media outlets, nor does the payment represent compensation to any media personnel.</p>
    <h3 style="margin-top:1em;">2.5 Opportunity Fee Disclosure</h3>
    <p style="line-height:1.8;">The bid fee paid upon successful publication is an <strong>opportunity fee</strong> for the use of the Provider's editorial matchmaking infrastructure—not for the purchase, guarantee, or influence of content. The Provider does <strong>not</strong> and <strong>cannot</strong> guarantee media outcomes.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">3. No Affiliation with Media Outlets</h2>
    <h3 style="margin-top:1em;">3.1 Independent Relationships</h3>
    <p style="line-height:1.8;">The Provider is an independent public-relations firm. It is <strong>not</strong> affiliated with, endorsed by, or representative of any publication or journalist listed on the Platform.</p>
    <h3 style="margin-top:1em;">3.2 No Compensation to Journalists</h3>
    <p style="line-height:1.8;">The Provider does <strong>not</strong> compensate journalists or publications in any form. Participation by journalists is entirely voluntary and unpaid.</p>
    <h3 style="margin-top:1em;">3.3 No Control Over Editorial Content</h3>
    <p style="line-height:1.8;">The Provider does <strong>not</strong> alter or approve the final media content. All editorial decisions are made independently by the journalists and/or publishers.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">4. Confidentiality, Non-Disclosure & Non-Circumvention</h2>
    <h3 style="margin-top:1em;">4.1 Confidential Information</h3>
    <p style="line-height:1.8;">All non-public information related to platform features, journalist queries, bid structures, user analytics, pricing logic, and sourcing methodology is deemed <strong>Confidential Information</strong>.</p>
    <h3 style="margin-top:1em;">4.2 Non-Disclosure Agreement (NDA)</h3>
    <p style="line-height:1.8;">By using the Platform, You agree to maintain <strong>strict confidentiality</strong> regarding all aspects of the Platform, including the identities of journalists, content of media queries, and any correspondence facilitated via the Platform.</p>
    <h3 style="margin-top:1em;">4.3 Non-Circumvention</h3>
    <p style="line-height:1.8;">You agree <strong>not</strong> to contact, solicit, or transact directly with any journalist, outlet, or contact introduced through the Platform, outside of the Platform itself. Any violation of this clause is grounds for immediate suspension and legal action, including injunctive relief and liquidated damages.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">5. Payment Terms</h2>
    <h3 style="margin-top:1em;">5.1 Subscription Billing</h3>
    <p style="line-height:1.8;">You authorize the Provider to charge Your designated payment method <strong>$99.99 per month</strong> until canceled by You with at least <strong>14 days' written notice</strong>.</p>
    <h3 style="margin-top:1em;">5.2 Bid Payment Trigger</h3>
    <p style="line-height:1.8;">A <strong>successful bid</strong> is defined as a quote or contribution submitted via the Platform that is selected and published by a third-party outlet. Upon such publication, the Provider will charge Your bid amount as stated at the time of submission.</p>
    <h3 style="margin-top:1em;">5.3 No Refund Policy</h3>
    <p style="line-height:1.8;">All subscription fees are <strong>non-refundable</strong>. Bid payments are only processed post-publication and are likewise non-refundable once confirmed.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">6. Disclaimers & Limitations</h2>
    <h3 style="margin-top:1em;">6.1 No Guarantee</h3>
    <p style="line-height:1.8;">The Provider does <strong>not</strong> guarantee publication, visibility, tone, or performance of any editorial piece. Platform access is a <strong>tool—not a promise of outcomes</strong>.</p>
    <h3 style="margin-top:1em;">6.2 No Editorial Control</h3>
    <p style="line-height:1.8;">The Provider does <strong>not</strong> control publication timelines, headline framing, editorial edits, or third-party distribution decisions.</p>
    <h3 style="margin-top:1em;">6.3 Limitation of Liability</h3>
    <p style="line-height:1.8;">To the fullest extent permitted by law, the Provider shall <strong>not</strong> be liable for any indirect, incidental, consequential, or punitive damages. <strong>Total liability</strong> in any case shall <strong>not</strong> exceed the amount paid by You to the Provider in the <strong>past three (3) months</strong>.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">7. Indemnification</h2>
    <p style="line-height:1.8;">You agree to <strong>defend, indemnify, and hold harmless</strong> the Provider and its affiliates, officers, agents, and employees from any claim or demand arising from Your use of the Platform, including any breach of this Agreement, violation of law, or misuse of confidential information.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">8. Binding Arbitration</h2>
    <h3 style="margin-top:1em;">8.1 Arbitration Clause</h3>
    <p style="line-height:1.8;">Any and all disputes arising under or related to this Agreement shall be resolved <strong>exclusively</strong> through <strong>final and binding arbitration</strong> administered by <strong>JAMS in New York, NY</strong>, in accordance with its rules then in effect.</p>
    <h3 style="margin-top:1em;">8.2 No Court Proceedings</h3>
    <p style="line-height:1.8;">You expressly <strong>waive</strong> the right to bring any claims in court or to participate in any class action. Arbitration shall be <strong>private and confidential</strong>.</p>
    <h3 style="margin-top:1em;">8.3 Fees & Enforcement</h3>
    <p style="line-height:1.8;">The prevailing party in arbitration shall be entitled to recover <strong>reasonable attorneys' fees and costs</strong>. The arbitrator's decision shall be enforceable in any court of competent jurisdiction.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">9. Termination</h2>
    <p style="line-height:1.8;">The Provider reserves the right to suspend or terminate Your access without notice for:</p>
    <ul style="line-height:1.8;">
      <li><strong>Breach</strong> of this Agreement;</li>
      <li><strong>Circumvention or misuse</strong> of Platform systems;</li>
      <li>Attempts to <strong>defraud, spam, or exploit</strong> the bidding process.</li>
    </ul>
    <p style="line-height:1.8;">No refunds will be issued upon termination for cause.</p>
    <hr/>
    <h2 style="margin-top:1.5em;">10. General Provisions</h2>
    <ul style="line-height:1.8;">
      <li><strong>Governing Law:</strong> This Agreement shall be governed by the laws of the <strong>State of New York</strong>.</li>
      <li><strong>Force Majeure:</strong> Neither party shall be liable for delays or failure due to acts beyond reasonable control.</li>
      <li><strong>Survival:</strong> Sections 3–8 of this Agreement shall survive any expiration or termination.</li>
      <li><strong>Modifications:</strong> The Provider may update these terms upon notice posted to the Platform. Continued use constitutes acceptance.</li>
    </ul>
    <hr/>
    <h2 style="margin-top:1.5em;">11. Acknowledgment</h2>
    <p style="line-height:1.8;">By continuing past this point, <strong>You</strong> acknowledge that You have <strong>read, understood, and agreed</strong> to be bound by this Platform Access Agreement. You further confirm that You are of <strong>legal age</strong> and have the authority to enter into this Agreement on behalf of Yourself or Your organization.</p>
  `;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Agreement Card */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl px-0 md:px-12 py-8 flex flex-col gap-8">
          <div className="mb-2 px-6 md:px-0">
            <h2 className="text-2xl font-bold mb-2">Platform Access Agreement</h2>
            <p className="text-gray-700 mb-4 leading-relaxed text-sm md:text-base">Please read and accept our platform access agreement to continue the signup process.</p>
          </div>
          {/* Scrollable Agreement Pane */}
          <div
            ref={agreementContentRef}
            onScroll={handleAgreementScroll}
            tabIndex={0}
            className="flex-1 border border-gray-200 rounded-lg bg-gray-50 px-6 py-8 max-h-[70vh] min-h-[350px] overflow-y-auto focus:outline-none prose prose-sm md:prose-base prose-h3:font-semibold prose-h3:text-lg prose-h3:mb-2 prose-p:mb-4 prose-p:leading-[1.6] prose-ul:pl-6 prose-ul:list-disc prose-ul:space-y-1 prose-li:mb-1"
            aria-label="Platform Access Agreement"
          >
            {agreementHtml ? (
              <div dangerouslySetInnerHTML={{ __html: agreementHtml }} />
            ) : (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!canSign && (
              <div className="w-full flex justify-center mt-4">
                <span className="text-xs text-gray-500 animate-bounce">Scroll to the bottom to enable signing.</span>
              </div>
            )}
          </div>
          {/* Name & Signature Section (revealed after scroll) */}
          <div className="flex flex-col md:flex-row gap-8 px-6 md:px-0">
            <div className="flex-1">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter your full legal name"
                required
                aria-disabled={!canSign}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white shadow-inner relative h-[220px] flex items-center justify-center">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#000"
                  canvasProps={{ className: 'w-full h-[220px] cursor-crosshair bg-white rounded-lg' }}
                />
                {!canSign && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white/70 rounded-lg">
                    <span className="text-gray-400 text-base font-medium">Sign here</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="text-sm text-gray-500 underline hover:text-blue-700 bg-transparent border-none cursor-pointer"
                  onClick={clearSignature}
                  disabled={!canSign}
                  aria-disabled={!canSign}
                >
                  Clear
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  className="text-xs text-blue-600 underline hover:text-blue-800 bg-transparent border-none cursor-pointer"
                  tabIndex={canSign ? 0 : -1}
                  aria-disabled={!canSign}
                  // TODO: Implement modal for typed signature
                  onClick={() => {}}
                  disabled={!canSign}
                >
                  Type signature instead
                </button>
              </div>
            </div>
          </div>
          {/* Sticky Acceptance Controls */}
          <div className="sticky bottom-0 bg-white py-4 px-6 md:px-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-30 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="terms"
                checked={hasAgreed}
                onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
                disabled={!canSign}
                aria-disabled={!canSign}
              />
              <label
                htmlFor="terms"
                className={`text-sm font-medium leading-none ${!canSign ? 'text-gray-400' : ''}`}
              >
                I have read and agree to the platform access agreement
              </label>
            </div>
            <Button
              type="button"
              className={`w-full bg-[#004684] hover:bg-[#003a70] text-white text-lg font-semibold transition-opacity duration-200 ${canSign && hasAgreed && fullName.length >= 3 && !isSignatureEmpty() ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
              aria-disabled={!canSign || !hasAgreed || fullName.length < 3 || isSignatureEmpty() || isLoading}
              disabled={isLoading || !hasAgreed || fullName.length < 3 || isSignatureEmpty() || !canSign}
              onClick={handleSubmit}
              tabIndex={canSign ? 0 : -1}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "I Agree & Continue"
              )}
            </Button>
            <div className="text-[11px] text-gray-500 text-center mt-1">
              By clicking 'I Agree & Continue' you consent to electronic signatures.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}