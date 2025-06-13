import React from 'react';
import { useSignupWizard } from '@/contexts/SignupWizardContext';

export function SignupProgress() {
  const { currentStage } = useSignupWizard();
  const stages = [
    { id: 'payment', label: 'Subscribe' },
    { id: 'profile', label: 'Profile' },
  ];
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);
  const percent = ((currentIndex) / (stages.length - 1)) * 100;

  return (
    <div className="mb-3 w-full max-w-2xl mx-auto">
      <div className="relative h-4 flex items-center">
        {/* Background bar */}
        <div className="absolute left-0 right-0 h-4 bg-white/20 rounded-full backdrop-blur-sm" />
        {/* Filled bar */}
        <div
          className="absolute left-0 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500 shadow-lg"
          style={{ width: `${percent}%`, maxWidth: '100%' }}
        />
        {/* Step icons */}
        <ol className="flex items-center w-full relative z-10">
          {stages.map((stage, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            return (
              <li
                key={stage.id}
                className={`flex-1 flex flex-col items-center relative ${index < stages.length - 1 ? 'mr-2' : ''}`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isActive
                      ? 'border-blue-400 bg-white/90 backdrop-blur-sm text-blue-600 shadow-lg'
                      : isCompleted
                      ? 'border-blue-400 bg-gradient-to-r from-blue-400 to-purple-500 text-white shadow-lg'
                      : 'border-white/40 bg-white/10 backdrop-blur-sm text-white/60'
                  } font-bold text-sm transition-all duration-300`}
                >
                  {index + 1}
                </div>
                <span
                  className={`mt-2 text-sm font-semibold transition-colors duration-300 ${
                    isActive
                      ? 'text-blue-300'
                      : isCompleted
                      ? 'text-blue-200'
                      : 'text-white/60'
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}