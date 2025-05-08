import React from 'react';
import { SignupProgress } from './SignupProgress';
import { Logo } from '../common/Logo';

interface SignupWizardProps {
  children: React.ReactNode;
}

export function SignupWizard({ children }: SignupWizardProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Logo height={40} />
            <div className="text-sm">
              Need help? <a href="mailto:support@quotebid.com" className="text-[#004684] hover:underline">Contact support</a>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Progress bar */}
          <SignupProgress />
          
          {/* Content */}
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-6 shadow-inner">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>
              &copy; {new Date().getFullYear()} QuoteBid. All rights reserved.
            </div>
            <div className="mt-2 md:mt-0 flex gap-4">
              <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
              <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}