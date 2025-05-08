import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateAgreementPDF, uploadAgreementPDF } from "@/lib/pdf-utils";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SignupWizard } from "@/components/signup/SignupWizard";
import { 
  advanceSignupStage, 
  storeSignupEmail, 
  storeSignupName, 
  getSignupEmail 
} from "@/lib/signup-wizard";

export default function Agreement() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [hasRead, setHasRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingAgreement, setExistingAgreement] = useState<{ pdfUrl: string; signedAt: string } | null>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [ipAddress, setIpAddress] = useState<string>("IP address not available");
  
  // Extract return path from URL if present (for redirecting after subscription)
  const [returnPath, setReturnPath] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnPath');
  });

  // Check if user has an existing agreement and fetch IP address
  useEffect(() => {
    const initialize = async () => {
      // Fetch the user's IP address
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          setIpAddress(data.ip);
        }
      } catch (error) {
        console.error('Failed to fetch IP address:', error);
      }
      
      // Store user email in localStorage for the PDF upload process
      if (user?.email) {
        localStorage.setItem('userEmail', user.email);
      }
      
      // Store user name in localStorage for the PDF upload process
      if (user?.fullName) {
        localStorage.setItem('userName', user.fullName);
      }
      
      // Check if user has an existing agreement
      if (user?.id) {
        try {
          const res = await apiRequest('GET', `/api/users/${user.id}/agreement-pdf`);
          
          if (res.ok) {
            const data = await res.json();
            setExistingAgreement(data);
          } else {
            console.log('No existing agreement found or not authorized');
          }
        } catch (error) {
          console.error('Error fetching existing agreement:', error);
        }
      }
      
      setIsLoading(false);
    };
    
    initialize();
  }, [user]);

  // Initialize the canvas when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set initial style for more precise drawing
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        
        // Clear the canvas to start fresh
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Handle signature drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    let x, y;
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling when starting touch
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let x, y;
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling during touch drawing
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignature(canvas.toDataURL('image/png'));
  };

  // Clear signature
  const clearSignature = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to sign the agreement.",
        variant: "destructive",
      });
      return;
    }
    
    if (!fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full legal name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please sign the agreement using the signature pad.",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasRead) {
      toast({
        title: "Agreement Confirmation Required",
        description: "Please confirm that you have read and agree to the terms.",
        variant: "destructive",
      });
      return;
    }
    
    if (!agreementRef.current) {
      toast({
        title: "Error",
        description: "Could not access agreement content.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate agreement PDF with signature and other details
      const agreementHtml = document.getElementById('agreementContent')?.innerHTML || '';
      const pdfBlob = await generateAgreementPDF(agreementHtml, {
        signature,
        name: fullName,
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString(),
        formattedTime: new Date().toLocaleTimeString(),
        ipAddress,
      });
      
      // Upload PDF and record agreement acceptance
      const downloadUrl = await uploadAgreementPDF(user.id, pdfBlob, ipAddress);
      
      // Record agreement acceptance in database
      const res = await apiRequest('POST', '/api/user/agreement', {
        userId: user.id,
        dateTime: new Date().toISOString(),
        fullName,
        pdfUrl: downloadUrl,
        ipAddress,
      });
      
      if (res.ok) {
        // Store signup info in localStorage for the wizard flow
        storeSignupEmail(user.email);
        storeSignupName(fullName);
        
        // Advance to the next stage in the wizard flow
        if (import.meta.env.VITE_NEXT_SIGNUP_WIZARD === 'true') {
          try {
            await advanceSignupStage(user.email, 'agreement');
          } catch (err) {
            console.error('Error advancing signup stage:', err);
            // Continue even if this fails - we can recover later
          }
        }
        
        toast({
          title: "Agreement Accepted",
          description: "You have successfully signed the agreement.",
        });
        
        // Redirect based on return path or to payment page
        if (returnPath) {
          setLocation(returnPath);
        } else {
          setLocation('/payment');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to record agreement acceptance');
      }
    } catch (error) {
      console.error('Agreement submission error:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to process your agreement. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Handle going back to opportunities or other original page
  const handleBack = () => {
    if (returnPath) {
      setLocation(returnPath);
    } else {
      setLocation('/opportunities');
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Loading agreement information...</p>
        </div>
      </div>
    );
  }
  
  // The main content for the agreement page
  const pageContent = (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="relative bg-[#004684] text-white">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="mb-2">
                <span className="text-white font-bold text-3xl tracking-tight">
                  <span>Quote</span><span className="font-extrabold">Bid</span>
                </span>
              </div>
              <h2 className="text-xl font-semibold">Platform Access Agreement</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {existingAgreement ? (
          // Show existing agreement
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <span className="text-sm text-gray-500 mr-2">Signed on:</span>
                <span className="font-medium">{new Date(existingAgreement.signedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
              <FileText className="h-20 w-20 text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold mb-2">Agreement Already Signed</h3>
              <p className="text-gray-500 text-center mb-6">You have already signed the platform access agreement.</p>
              
              <a 
                href={existingAgreement.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#004684] hover:bg-[#003a70] text-white py-2 px-4 rounded-md inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Signed Agreement
              </a>
            </div>
          </div>
        ) : (
          // Show agreement signing template
          <div className="bg-white rounded-lg shadow-md p-8">
            <div id="agreementContent" ref={agreementRef} className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-6 mb-8 text-sm leading-relaxed">
              <h2 className="text-xl font-bold mb-4">PLATFORM ACCESS AGREEMENT</h2>
              <p className="mb-2">Effective Date: Upon Acceptance by User</p>
              <p className="mb-4">Provider: Rubicon PR Group LLC, a Delaware Limited Liability Company ("Provider")</p>
              <p className="mb-6">User: The individual or entity accessing the platform ("Client," "User," or "You")</p>

              <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
              <p className="mb-4">This Platform Access Agreement ("Agreement") governs the terms under which You access and use the proprietary PR bidding platform operated by Rubicon PR Group LLC (the "Provider"). By clicking "I Agree," creating an account, or making payment, You agree to be legally bound by this Agreement.</p>

              <h3 className="text-lg font-semibold mb-2">2. Access & Subscription</h3>
              <p className="mb-2">2.1 Platform Use. The Provider offers a digital marketplace allowing qualified users to view and respond to real media opportunities by submitting editorial pitches and placing monetary bids for consideration.</p>
              <p className="mb-2">2.2 Monthly Subscription Fee. A recurring fee of $99.99/month grants You access to the Platform's media request database and the ability to submit bids. This is a non-refundable access fee.</p>
              <p className="mb-2">2.3 Bidding Model. You may place a monetary bid in connection with a specific journalist's query. You will only be charged the bid amount if your pitch is selected and successfully published. No further fees will be charged for unsuccessful bids.</p>
              <p className="mb-2">2.4 Fees Go to Provider Only. All fees collected via the Platform—including subscription fees and successful bid fees—are payable solely to the Provider. No portion of any fee is paid to journalists, publishers, or media outlets, nor does the payment represent compensation to any media personnel.</p>
              <p className="mb-4">2.5 Opportunity Fee Disclosure. The bid fee paid upon successful publication is an opportunity fee for the use of the Provider's editorial matchmaking infrastructure—not for the purchase, guarantee, or influence of content. The Provider does not and cannot guarantee media outcomes.</p>

              <h3 className="text-lg font-semibold mb-2">3. No Affiliation with Media Outlets</h3>
              <p className="mb-2">3.1 Independent Relationships. The Provider is an independent public relations firm. It is not affiliated with, endorsed by, or representative of any publication or journalist listed on the platform. Opportunities are sourced, organized, and published under the Provider's editorial discretion.</p>
              <p className="mb-2">3.2 No Compensation to Journalists. The Provider does not compensate journalists or publications in any form. Participation by journalists is entirely voluntary and unpaid.</p>
              <p className="mb-4">3.3 No Control Over Editorial Content. The Provider does not alter or approve the final media content. All editorial decisions are made independently by the journalists and/or publishers.</p>

              <h3 className="text-lg font-semibold mb-2">4. Confidentiality, Non-Disclosure & Non-Circumvention</h3>
              <p className="mb-2">4.1 Confidential Information. All non-public information related to platform features, journalist queries, bid structures, user analytics, pricing logic, and sourcing methodology is deemed Confidential Information.</p>
              <p className="mb-2">4.2 Non-Disclosure Agreement (NDA). By using the Platform, You agree to maintain strict confidentiality regarding all aspects of the Platform, including the identities of journalists, content of media queries, and any correspondence facilitated via the Platform.</p>
              <p className="mb-4">4.3 Non-Circumvention. You agree not to contact, solicit, or transact directly with any journalist, outlet, or contact introduced through the Platform, outside of the Platform itself. Any violation of this clause is grounds for immediate suspension and legal action, including injunctive relief and liquidated damages.</p>

              <h3 className="text-lg font-semibold mb-2">5. Payment Terms</h3>
              <p className="mb-2">5.1 Subscription Billing. You authorize the Provider to charge Your designated payment method $99.99 per month until canceled by You with at least 14 days' written notice.</p>
              <p className="mb-2">5.2 Bid Payment Trigger. A successful bid is defined as a quote or contribution submitted via the Platform that is selected and published by a third-party outlet. Upon such publication, the Provider will charge Your bid amount as stated at the time of submission.</p>
              <p className="mb-4">5.3 No Refund Policy. All subscription fees are non-refundable. Bid payments are only processed post-publication and are likewise non-refundable once confirmed.</p>

              <h3 className="text-lg font-semibold mb-2">6. Disclaimers & Limitations</h3>
              <p className="mb-2">6.1 No Guarantee. The Provider does not guarantee publication, visibility, tone, or performance of any editorial piece. Platform access is a tool—not a promise of outcomes.</p>
              <p className="mb-2">6.2 No Editorial Control. The Provider does not control publication timelines, headline framing, editorial edits, or third-party distribution decisions.</p>
              <p className="mb-4">6.3 Limitation of Liability. To the fullest extent permitted by law, the Provider shall not be liable for any indirect, incidental, consequential, or punitive damages. Total liability in any case shall not exceed the amount paid by You to the Provider in the past 3 months.</p>

              <h3 className="text-lg font-semibold mb-2">7. Indemnification</h3>
              <p className="mb-4">You agree to defend, indemnify, and hold harmless the Provider and its affiliates, officers, agents, and employees from any claim or demand arising from Your use of the Platform, including any breach of this Agreement, violation of law, or misuse of confidential information.</p>

              <h3 className="text-lg font-semibold mb-2">8. Binding Arbitration</h3>
              <p className="mb-2">8.1 Arbitration Clause. Any and all disputes arising under or related to this Agreement shall be resolved exclusively through final and binding arbitration administered by JAMS in New York, NY, in accordance with its rules then in effect.</p>
              <p className="mb-2">8.2 No Court Proceedings. You expressly waive the right to bring any claims in court or to participate in any class action. Arbitration shall be private and confidential.</p>
              <p className="mb-4">8.3 Fees & Enforcement. The prevailing party in arbitration shall be entitled to recover reasonable attorneys' fees and costs. The arbitrator's decision shall be enforceable in any court of competent jurisdiction.</p>

              <h3 className="text-lg font-semibold mb-2">9. Termination</h3>
              <p className="mb-4">The Provider reserves the right to suspend or terminate Your access without notice for: Breach of this Agreement; Circumvention or misuse of Platform systems; Attempts to defraud, spam, or exploit the bidding process. No refunds will be issued upon termination for cause.</p>

              <h3 className="text-lg font-semibold mb-2">10. General Provisions</h3>
              <p className="mb-2">Governing Law: This Agreement shall be governed by the laws of the State of New York.</p>
              <p className="mb-2">Force Majeure: Neither party shall be liable for delays or failure due to acts beyond reasonable control.</p>
              <p className="mb-2">Survival: Sections 3–8 of this Agreement shall survive any expiration or termination.</p>
              <p className="mb-4">Modifications: The Provider may update these terms upon notice posted to the Platform. Continued use constitutes acceptance.</p>

              <h3 className="text-lg font-semibold mb-2">11. Acknowledgment</h3>
              <p className="mb-4">By continuing past this point, You acknowledge that You have read, understood, and agreed to be bound by this Platform Access Agreement. You further confirm that You are of legal age and have the authority to enter into this Agreement on behalf of Yourself or Your organization.</p>


            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Your Information</h3>
              
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="mb-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Signature
                </label>
                <div className="border border-gray-300 rounded-lg mb-2">
                  <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={200} 
                    className="w-full touch-none cursor-crosshair border border-gray-200"
                    style={{ touchAction: 'none' }} /* Prevent touch scrolling */
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                    onTouchCancel={endDrawing}
                  />
                </div>
                <div className="text-right">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={clearSignature}
                  >
                    Clear Signature
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start mb-8">
              <Checkbox 
                id="agreement" 
                checked={hasRead} 
                onCheckedChange={(checked) => setHasRead(checked as boolean)}
                className="mt-0.5"
              />
              <label 
                htmlFor="agreement" 
                className="ml-2 text-sm text-gray-700 cursor-pointer"
              >
                I have read, understood, and agree to be bound by all the terms and conditions of this Platform Access Agreement. I confirm I am of legal age and have the authority to enter into this agreement.
              </label>
            </div>
            
            <div className="mt-8 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span>Your IP Address: {ipAddress}</span>
              </div>

              <Button
                type="button"
                className="bg-[#004684] hover:bg-[#003a70] px-8"
                disabled={isSubmitting || !hasRead || !signature || !fullName.trim()}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  // Wrap the content with the SignupWizard component when the feature flag is enabled
  return import.meta.env.VITE_NEXT_SIGNUP_WIZARD === 'true' 
    ? <SignupWizard>{pageContent}</SignupWizard>
    : pageContent;
}