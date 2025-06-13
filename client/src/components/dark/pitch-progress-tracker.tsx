import React from "react";
import { format } from 'date-fns';
import { Check, Clock, Send, Eye, Award, AlertCircle } from "lucide-react";
import clsx from "clsx";

// Import the canonical PitchStatus type
import { PitchStatus } from "@/utils/pitchStage";

// Define the stages a pitch can go through
export type Stage =
  | 'submitted'
  | 'sent_to_reporter'
  | 'reporter_interested' 
  | 'reporter_not_interested'
  | 'successful_coverage';

// Map PitchStatus to Stage for backwards compatibility
const mapStatusToStage = (status: PitchStatus): Stage => {
  switch (status) {
    case 'draft': return 'submitted';
    case 'pending': return 'submitted';
    case 'sent': return 'sent_to_reporter';
    case 'interested': return 'reporter_interested';
    case 'not_interested': return 'reporter_not_interested';
    case 'successful': return 'successful_coverage';
    default: return status as Stage;
  }
};

// Define the mapping of stages to display text
const stageDisplayText: Record<Stage, string> = {
  submitted: 'Submitted',
  sent_to_reporter: 'Sent',
  reporter_interested: 'Interested',
  reporter_not_interested: 'Not Selected',
  successful_coverage: 'Published',
};

// Define icons for each stage
const icons: Record<Stage, any> = {
  submitted: Clock,
  sent_to_reporter: Send,
  reporter_interested: Eye,
  reporter_not_interested: AlertCircle,
  successful_coverage: Award,
};

// Define the pitch data interface
interface PitchData {
  paymentIntentId: string | null;
}

interface DarkPitchProgressTrackerProps {
  currentStage: PitchStatus;
  stageTimestamps?: Partial<Record<PitchStatus, Date>>;
  needsFollowUp?: boolean;
  pitch: PitchData;
}

export default function DarkPitchProgressTracker({ 
  currentStage: rawStage, 
  stageTimestamps = {},
  needsFollowUp = false,
  pitch 
}: DarkPitchProgressTrackerProps) {
  // Convert to canonical stage
  const currentStage = mapStatusToStage(rawStage);
  const declined = currentStage === 'reporter_not_interested';
  const successful = currentStage === 'successful_coverage';
  
  // Define the stages in order for the stepper
  const stages: Stage[] = declined 
    ? ['submitted', 'sent_to_reporter', 'reporter_not_interested'] 
    : ['submitted', 'sent_to_reporter', 'successful_coverage'];

  // Get current stage index
  const currentStageIndex = stages.findIndex(stage => stage === currentStage);
  const activeStageIndex = Math.max(0, currentStageIndex);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-6 left-8 right-8 h-0.5 bg-slate-600/50"></div>
        
        {/* Progress line */}
        <div 
          className={`absolute top-6 left-8 h-0.5 transition-all duration-500 ${
            declined ? 'bg-red-500' : 
            successful ? 'bg-green-500' : 
            'bg-blue-500'
          }`}
          style={{ 
            width: activeStageIndex === 0 ? '0%' : 
                   activeStageIndex === 1 ? 'calc(50% - 32px)' : 
                   'calc(100% - 64px)' 
          }}
        ></div>

        {/* Steps */}
        {stages.map((stage, index) => {
          const isCompleted = index < activeStageIndex;
          const isCurrent = index === activeStageIndex;
          const Icon = icons[stage];
          
          return (
            <div key={stage} className="flex flex-col items-center relative z-10">
              {/* Step circle */}
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${declined ? (
                  isCompleted ? 'bg-red-500 border-red-500' : 
                  isCurrent ? 'bg-red-900/30 border-red-500' : 
                  'bg-slate-700/50 border-slate-600'
                ) : successful ? (
                  isCompleted ? 'bg-green-500 border-green-500' : 
                  isCurrent ? 'bg-green-900/30 border-green-500' : 
                  'bg-slate-700/50 border-slate-600'
                ) : (
                  isCompleted ? 'bg-blue-500 border-blue-500' : 
                  isCurrent ? 'bg-blue-900/30 border-blue-500' : 
                  'bg-slate-700/50 border-slate-600'
                )}
              `}>
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Icon className={`h-5 w-5 ${
                    declined ? (
                      isCurrent ? 'text-red-400' : 'text-gray-500'
                    ) : successful ? (
                      isCurrent ? 'text-green-400' : 'text-gray-500'
                    ) : (
                      isCurrent ? 'text-blue-400' : 'text-gray-500'
                    )
                  }`} />
                )}
              </div>
              
              {/* Step label */}
              <span className={`
                mt-3 text-sm font-medium text-center
                ${declined ? (
                  isCompleted ? 'text-red-400' : 
                  isCurrent ? 'text-red-400' : 
                  'text-gray-400'
                ) : successful ? (
                  isCompleted ? 'text-green-400' : 
                  isCurrent ? 'text-green-400' : 
                  'text-gray-400'
                ) : (
                  isCompleted ? 'text-blue-400' : 
                  isCurrent ? 'text-blue-400' : 
                  'text-gray-400'
                )}
              `}>
                {stageDisplayText[stage]}
              </span>
              
              {/* Follow-up indicator */}
              {needsFollowUp && stage === 'reporter_interested' && isCurrent && (
                <span className="mt-1 text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded-full font-medium border border-orange-700/50">
                  Action needed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 