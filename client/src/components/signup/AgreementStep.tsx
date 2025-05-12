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
  const [agreementHtml, setAgreementHtml] = useState<string>('');
  const sigRef = useRef<SignatureCanvas>(null);
  const email = getSignupEmail();

  useEffect(() => {
    setStage('agreement'); // Ensure progress bar is on step 1
    // Fetch the agreement text
    fetch('/api/onboarding/agreement.html')
      .then(response => response.text())
      .then(html => {
        setAgreementHtml(html);
      })
      .catch(error => {
        console.error('Error fetching agreement:', error);
        toast({
          title: 'Error',
          description: 'Could not load the agreement. Please try again.',
          variant: 'destructive',
        });
      });
  }, [toast, setStage]);

  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
  };

  const isSignatureEmpty = () => {
    return sigRef.current?.isEmpty() || false;
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
      // Store agreement data in localStorage
      localStorage.setItem('signup_agreement', JSON.stringify({ fullName, signature }));
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-120px)]">
      <h2 className="text-2xl font-bold mb-4">Platform Access Agreement</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">
          Please read and accept our platform access agreement to continue the signup process.
        </p>
        
        {/* Agreement Content */}
        <div className="border rounded-md p-4 mb-4 bg-gray-50">
          {agreementHtml ? (
            <div 
              className="prose max-w-none max-h-64 overflow-y-auto mb-4 text-sm"
              dangerouslySetInnerHTML={{ __html: agreementHtml }}
            />
          ) : (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        {/* Full Name Input */}
        <div className="mb-4">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Legal Name
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter your full legal name"
            required
          />
        </div>
        
        {/* Signature Pad */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">
            Signature
          </label>
          <div className="border rounded-md">
            <SignatureCanvas
              ref={sigRef}
              penColor="#000"
              canvasProps={{
                className: 'w-full h-28 cursor-crosshair'
              }}
            />
          </div>
          <div className="flex justify-end mt-1">
            <Button 
              type="button" 
              variant="outline" 
              className="text-xs" 
              onClick={clearSignature}
            >
              Clear Signature
            </Button>
          </div>
        </div>
        
        {/* Agreement Confirmation Checkbox */}
        <div className="flex items-start space-x-2 mb-6">
          <Checkbox 
            id="terms" 
            checked={hasAgreed}
            onCheckedChange={(checked) => setHasAgreed(checked as boolean)} 
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and agree to the platform access agreement
          </label>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <Button
            type="button"
            className="bg-[#004684] hover:bg-[#003a70] text-white"
            disabled={isLoading || !hasAgreed || fullName.length < 3 || isSignatureEmpty()}
            onClick={handleSubmit}
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
        </div>
      </div>
    </div>
  );
}