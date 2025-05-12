import React from 'react';
import { Check } from 'lucide-react';
import { useSignupWizard } from '@/contexts/SignupWizardContext';

export function SignupProgress() {
  const { currentStage } = useSignupWizard();
  const stages = [
    { id: 'agreement', label: 'Agreement' },
    { id: 'payment', label: 'Payment' },
    { id: 'profile', label: 'Profile' },
  ];
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);
  const percent = ((currentIndex) / (stages.length - 1)) * 100;

  return (
    <div className="mb-10 w-full max-w-2xl mx-auto">
      {/* Modern filled progress bar */}
      <div className="relative h-4 flex items-center">
        {/* Background bar */}
        <div className="absolute left-0 right-0 h-4 bg-gray-200 rounded-full" />
        {/* Filled bar */}
        <div
          className="absolute left-0 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, maxWidth: '100%' }}
        />
        {/* Step icons */}
        {stages.map((stage, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <div
              key={stage.id}
              className="absolute"
              style={{ left: `calc(${(index) / (stages.length - 1) * 100}% - 20px)` }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 text-lg font-bold shadow transition-all duration-300
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-white border-green-500 text-green-600' :
                    'bg-white border-gray-300 text-gray-400'}`}
              >
                {isCompleted ? <Check className="h-6 w-6" /> : index + 1}
              </div>
            </div>
          );
        })}
      </div>
      {/* Step labels */}
      <div className="flex justify-between mt-2 px-1">
        {stages.map((stage, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <span
              key={stage.id}
              className={`text-base text-center w-24 ${isActive ? 'text-green-700 font-semibold' : isCompleted ? 'text-green-500' : 'text-gray-500'}`}
              style={{ minWidth: 60 }}
            >
              {stage.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}