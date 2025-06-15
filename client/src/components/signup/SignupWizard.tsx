import React, { useEffect, useState } from 'react';
import { SignupProgress } from './SignupProgress';
import { Logo } from '../common/Logo';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface SignupWizardProps {
  children: React.ReactNode;
}

// Add custom CSS for animations
const customStyles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

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

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.location.href = "/login";
  };

  // Determine footer visibility based on current stage
  const isFooterFaded = currentStage === 'payment' || currentStage === 'profile';
  const shouldShowBorder = (!currentStage || currentStage === 'legacy');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen relative font-inter text-gray-900 overflow-hidden flex flex-col">
        {/* ——— Premium dark gradient backdrop ——— */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900" />
        {/* Overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* HIDE HEADER FOR READY STAGE */}
        {currentStage !== 'ready' && (
          <header className="relative z-30 py-4 px-4 md:py-6 md:px-8 flex-shrink-0">
            {/* Mobile Layout - Logo centered */}
            <div className="md:hidden max-w-7xl mx-auto flex items-center justify-center">
              <div className="flex items-center cursor-default">
                <span className="text-white font-black text-3xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-3 px-2.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center">
                  Beta
                </div>
              </div>
            </div>

            {/* Desktop Layout - Full layout with all elements */}
            <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between">
              {/* Left: QuoteBid logo */}
              <div className="flex items-center cursor-default">
                <span className="text-white font-black text-4xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-4 px-2.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-sm font-bold uppercase tracking-wider backdrop-blur-sm flex items-center">
                  Beta
                </div>
              </div>
              
              {/* Center: Signup banner */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-base font-bold uppercase tracking-wide backdrop-blur-sm">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                  QuoteBid Signup
                </div>
              </div>

              {/* Right: Space for balance */}
              <div className="w-32"></div>
            </div>
          </header>
        )}

        {/* HIDE PROGRESS BAR FOR READY STAGE */}
        {currentStage !== 'ready' && (
          <div className="relative z-20 pb-4 md:pb-8 px-4 md:px-6 flex-shrink-0">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-white text-base md:text-lg lg:text-xl font-bold mb-4 md:mb-8">
                {stepText}
              </p>
              
            {/* Interactive Progress Bar */}
              <div className="w-full max-w-md md:max-w-lg mx-auto mb-4">
              <SignupProgress />
              </div>
            </div>
          </div>
        )}

      {/* Main content */}
        <main className="relative z-20 flex-1 flex items-center">
        <div className="w-full">
          {children}
        </div>
      </main>

        {/* HIDE FOOTER FOR READY STAGE */}
        {currentStage !== 'ready' && (
          <footer className="relative z-20 py-6 md:py-12 opacity-100">
            
            <div className="max-w-7xl mx-auto px-4 md:px-8 text-center relative z-10">
              <div className="mb-4 md:mb-6">
                {/* Mobile Footer Logo */}
                <div className="md:hidden inline-flex items-center cursor-default mb-3">
                  <span className="text-white font-black text-3xl tracking-tight">
                    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                  </span>
                  <div className="ml-3 px-2.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center">
                    Beta
                  </div>
                </div>
                
                {/* Desktop Footer Logo */}
                <div className="hidden md:inline-flex items-center cursor-default mb-4">
                  <span className="text-white font-black text-4xl tracking-tight">
                    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                  </span>
                  <div className="ml-4 px-2.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-sm font-bold uppercase tracking-wider backdrop-blur-sm flex items-center">
                    Beta
                  </div>
                </div>
                <p className="text-gray-400 text-sm md:text-base">
                  The World's First Live Marketplace for Earned Media
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-6 md:mb-8">
                <span className="text-gray-300 text-sm md:text-lg font-medium cursor-default">
                  Terms of Use
                </span>
                <span className="text-gray-300 text-sm md:text-lg font-medium cursor-default">
                  Privacy
                </span>
                <span className="text-gray-300 text-sm md:text-lg font-medium cursor-default">
                  Editorial Integrity
                </span>
              </div>
              
              <div className={`pt-6 md:pt-8 ${shouldShowBorder ? 'border-t border-white/20' : ''}`}>
                <p className="text-gray-400 text-sm md:text-lg">
                  &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
                </p>
                <p className="text-gray-500 text-xs md:text-sm mt-2">
                  Built For Experts, Not PR Agencies.
                </p>
            </div>
          </div>
        </footer>
        )}
    </div>
    </>
  );
}