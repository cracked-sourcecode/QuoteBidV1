import React, { useEffect, useState } from 'react';
import { SignupProgress } from './SignupProgress';
import { Logo } from '../common/Logo';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface SignupWizardProps {
  children: React.ReactNode;
}

const STAGE_LABELS = [
  { id: 'payment', label: 'Subscribe' },
  { id: 'profile', label: 'Profile' },
];

export function SignupWizard({ children }: SignupWizardProps) {
  const { currentStage } = useSignupWizard();
  const stageOrder = ['payment', 'profile'];
  const currentIndex = STAGE_LABELS.findIndex(s => s.id === currentStage);
  const currentStep = stageOrder.indexOf(currentStage) + 1;
  const stepText = currentIndex >= 0
    ? `Step ${currentStep} of 2: ${STAGE_LABELS[currentIndex].label}`
    : '';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Clean Wizard Header */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-30">
        <div className="flex flex-col items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#004684] mb-1">QuoteBid Signup</h1>
          <p className="text-xs sm:text-sm text-gray-500 mb-4">{stepText}</p>
          {/* Interactive Progress Bar */}
          <div className="w-full max-w-md flex justify-center items-center">
            <SignupProgress />
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="w-full">
          {/* Content only, no lower header */}
          {children}
        </div>
      </main>
      {/* Footer - Hidden on mobile for payment step */}
      <footer className="hidden lg:block bg-white py-6 shadow-inner">
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