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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Clean Wizard Header */}
      <header className="w-full bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="flex flex-col items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#004684] mb-2">QuoteBid Signup</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{stepText}</p>
          {/* Interactive Progress Bar */}
          <div className="w-full max-w-md flex justify-center items-center">
            <SignupProgress />
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 py-4 sm:py-6 lg:py-8">
        <div className="w-full">
          {/* Content only, no lower header */}
          {children}
        </div>
      </main>
      {/* Footer - Hidden on mobile for payment step */}
      <footer className="hidden lg:block bg-white/80 backdrop-blur-sm py-6 shadow-inner border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-sm text-gray-600">
            <div className="mb-2">
              Need help? <a href="mailto:support@quotebid.com" className="text-blue-600 hover:underline font-medium">Contact support</a>
            </div>
            <div className="text-gray-500">
              &copy; {new Date().getFullYear()} QuoteBid. All rights reserved.
            </div>
            <div className="mt-2 flex gap-6">
              <a href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</a>
              <a href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}