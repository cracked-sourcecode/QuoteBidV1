import React from 'react';
import { useSignupWizard } from '@/contexts/SignupWizardContext';

export function SignupProgress() {
  const { currentStage } = useSignupWizard();
  const stages = [
    { id: 'agreement', label: 'Agreement' },
    { id: 'payment', label: 'Subscribe' },
    { id: 'profile', label: 'Profile' },
  ];
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);
  const percent = ((currentIndex) / (stages.length - 1)) * 100;

  return (
    <div className="mb-10 w-full max-w-2xl mx-auto">
      <div className="relative h-4 flex items-center">
        {/* Background bar */}
        <div className="absolute left-0 right-0 h-4 bg-gray-200 rounded-full" />
        {/* Filled bar */}
        <div
          className="absolute left-0 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
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
                      ? 'border-green-600 bg-white text-green-600'
                      : isCompleted
                      ? 'border-green-400 bg-green-400 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  } font-bold text-lg transition-colors duration-200`}
                >
                  {index + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isActive
                      ? 'text-green-700'
                      : isCompleted
                      ? 'text-green-500'
                      : 'text-gray-400'
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