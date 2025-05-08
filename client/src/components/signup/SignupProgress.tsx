import React from 'react';
import { Check } from 'lucide-react';
import { SignupStage } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';

export function SignupProgress() {
  const { currentStage } = useSignupWizard();
  // Define the stages and their order - remove 'ready' stage per punch list item #6
  const stages = [
    { id: 'agreement', label: 'Agreement' },
    { id: 'payment', label: 'Payment' },
    { id: 'profile', label: 'Profile' },
  ];

  // Find the index of the current stage
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          // Determine if this stage is active, completed, or upcoming
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div 
              key={stage.id} 
              className="flex flex-col items-center relative"
              style={{ width: index === 0 || index === stages.length - 1 ? 'auto' : '100%' }}
            >
              {/* Stage indicator circle - reduced size per punch list item #3 */}
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 text-sm ${
                  isActive
                    ? 'bg-white text-[#004684] border-[#004684] font-bold'
                    : isCompleted
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-500 border-neutral-300'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              {/* Stage label */}
              <span 
                className={`mt-2 text-sm ${
                  isActive
                    ? 'text-[#004684] font-bold'
                    : isCompleted
                      ? 'text-green-500 font-medium'
                      : 'text-gray-500'
                }`}
              >
                {stage.label}
              </span>
              
              {/* Connector line with increased contrast per punch list item #3 */}
              {index < stages.length - 1 && (
                <div 
                  className="absolute top-3 w-full h-0.5 left-1/2"
                  style={{
                    background: isCompleted
                      ? 'linear-gradient(to right, #22c55e, #22c55e)'
                      : isActive
                        ? 'linear-gradient(to right, #004684, #e5e7eb)'
                        : '#d1d5db' // neutral-300 for better contrast
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}