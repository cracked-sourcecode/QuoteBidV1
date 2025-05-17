import React, { useEffect } from 'react';
import { SignupProgress } from './SignupProgress';
import { Logo } from '../common/Logo';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { useLocation } from 'wouter';

interface SignupWizardProps {
  children: React.ReactNode;
}

const STAGE_LABELS = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'payment', label: 'Subscribe' },
  { id: 'profile', label: 'Profile' },
];

export function SignupWizard({ children }: SignupWizardProps) {
  const { currentStage } = useSignupWizard();
  const [, setLocation] = useLocation();
  const currentIndex = STAGE_LABELS.findIndex(s => s.id === currentStage);
  const currentStep = currentIndex + 1;
  const stepText = currentIndex >= 0
    ? `Step ${currentStep} of 3: ${STAGE_LABELS[currentIndex].label}`
    : '';

  // Handle navigation
  useEffect(() => {
    // Get current step from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlStep = parseInt(urlParams.get('step') || '1');
    
    // Get highest step from localStorage
    const highestStep = parseInt(localStorage.getItem('signup_highest_step') || '1');

    // If trying to go back, force forward
    if (urlStep < highestStep) {
      setLocation(`/auth?tab=signup&step=${highestStep}`, { replace: true });
      return;
    }

    // If on wrong step, redirect
    if (urlStep !== currentStep) {
      setLocation(`/auth?tab=signup&step=${currentStep}`, { replace: true });
    }
  }, [currentStep, setLocation]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Clean Wizard Header */}
      <header className="w-full bg-white shadow-none border-none sticky top-0 z-30">
        <div className="flex flex-col items-center max-w-7xl mx-auto px-8 pt-8 pb-4">
          <span className="text-2xl font-bold text-[#004684] mb-1">QuoteBid Signup</span>
          <span className="text-sm text-gray-500 mb-4">{stepText}</span>
          {/* Interactive Progress Bar */}
          <div className="w-full flex justify-center items-center mt-6">
            <SignupProgress />
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Content only, no lower header */}
          {children}
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-white py-6 shadow-inner">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-sm text-gray-500">
            <div className="mb-2">
              Need help? <a href="mailto:support@quotebid.com" className="text-blue-600 hover:underline">Contact support</a>
            </div>
            <div>
              &copy; {new Date().getFullYear()} QuoteBid. All rights reserved.
            </div>
            <div className="mt-2 flex gap-4">
              <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
              <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}