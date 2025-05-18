import React from "react";
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Send, Star, Trophy, AlertTriangle } from "lucide-react";
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
  reporter_not_interested: 'Declined',
  successful_coverage: 'Success',
};

// Define icons for each stage
const icons: Record<Stage, JSX.Element> = {
  submitted: <FileText className="h-4 w-4" />,
  sent_to_reporter: <Send className="h-4 w-4" />,
  reporter_interested: <Star className="h-4 w-4" />,
  reporter_not_interested: <AlertTriangle className="h-4 w-4" />,
  successful_coverage: <Trophy className="h-4 w-4" />,
};

// Define the pitch data interface
interface PitchData {
  paymentIntentId: string | null;
}

interface PitchProgressTrackerProps {
  currentStage: PitchStatus; // Accept existing PitchStatus for backward compatibility
  stageTimestamps?: Partial<Record<PitchStatus, Date>>;
  needsFollowUp?: boolean;
  pitch: PitchData;
}

export default function PitchProgressTracker({ 
  currentStage: rawStage, 
  stageTimestamps = {},
  needsFollowUp = false,
  pitch 
}: PitchProgressTrackerProps) {
  // Convert to canonical stage
  const currentStage = mapStatusToStage(rawStage);
  const declined = currentStage === 'reporter_not_interested';
  
  // Define the stages in order for the stepper
  // For declined pitches: submitted, sent, declined
  // For successful pitches: submitted, sent, interested, successful
  const stages: Stage[] = 
    declined 
      ? ['submitted', 'sent_to_reporter', 'reporter_not_interested'] 
      : currentStage === 'successful_coverage'
        ? ['submitted', 'sent_to_reporter', 'reporter_interested', 'successful_coverage']
        : ['submitted', 'sent_to_reporter', currentStage];

  // Get current stage index
  const currentStageIndex = stages.findIndex(stage => stage === currentStage);

  // Determine display stages
  const displayStages = stages;

  // Calculate progress percentage for the progress bar
  // For successful pitches: submitted (25%) -> sent (50%) -> interested (75%) -> successful (100%)
  // For declined pitches: submitted (33%) -> sent (66%) -> declined (100%)
  const progressPercentage = Math.min(
    100,
    currentStageIndex >= 0 ? ((currentStageIndex / (stages.length - 1)) * 100) : 0
  );

  // Accessibility text
  const a11yText = `Pitch progress: ${currentStageIndex + 1} of ${stages.length} steps completed${declined ? ', declined' : ''}`;

  return (
    <div 
      className="flex flex-col w-full px-6 py-6 bg-gray-50 rounded-xl shadow-sm border border-gray-100"
      aria-label={a11yText}
      role="navigation"
    >
      {/* Progress bar with stages */}
      <div className="relative flex items-center justify-between w-full pt-6">
        {/* Background line - now thicker and rounder */}
        <div className="absolute top-1/2 left-0 w-full h-4 -translate-y-1/2 bg-gray-200 rounded-full">
          {/* Gradient progress bar with animated width - red for denied pitches */}
          <div
            className={`h-4 rounded-full transition-all duration-700 gloss shadow-inner ${
              declined 
                ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600' 
                : 'bg-gradient-to-r from-brand-500 via-brand-700 to-brand-900'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Stage circles */}
        {displayStages.map((stage, idx) => {
          const filled = idx < currentStageIndex;
          const current = idx === currentStageIndex;
          const isDeclinedFinal = stage === 'reporter_not_interested';
          const isSuccessFinal = stage === 'successful_coverage' && !declined;
          const isInterested = stage === 'reporter_interested' && currentStage === 'reporter_interested';
          
          // Circle styling based on state
          const circleCls = clsx(
            'relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300',
            filled && 'bg-gradient-to-br from-brand-500 to-brand-900 text-white shadow-lg',
            current && !isDeclinedFinal && !isSuccessFinal && !isInterested && 'bg-white ring-3 ring-brand-700 text-brand-700',
            !filled && !current && !isDeclinedFinal && !isSuccessFinal && !isInterested && 'bg-white border-2 border-gray-300 text-gray-400',
            isDeclinedFinal && declined && 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg',
            isSuccessFinal && currentStage === 'successful_coverage' && 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg',
            isInterested && 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg'
          );
          
          // Label styling based on state
          const labelCls = clsx(
            "mt-3 text-xs text-center font-medium max-w-[80px]",
            filled ? 'text-brand-700' :
            current ? 'text-brand-900 font-bold' :
            isInterested ? 'text-amber-600 font-bold' :
            isDeclinedFinal && declined ? 'text-red-600 font-bold' :
            isSuccessFinal ? 'text-emerald-600 font-bold' :
            'text-gray-500'
          );

          return (
            <div className="flex flex-col items-center" key={stage}>
              <div 
                className={circleCls}
                aria-current={current ? "step" : undefined}
              >
                {/* Icon */}
                {icons[stage]}
                
                {/* Screen reader text */}
                <span className="sr-only">{stageDisplayText[stage]}</span>
              </div>
              
              {/* Label */}
              <span className={labelCls}>
                {stageDisplayText[stage]}
                {stage === 'reporter_not_interested' && '⚠'} 
                {stage === 'successful_coverage' && !declined && '🏆'}
                {stage === 'reporter_interested' && '🔔'}
              </span>
              
              {/* Follow-up badge for interested stage */}
              {needsFollowUp && stage === 'reporter_interested' && currentStage === 'reporter_interested' && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-800 text-[10px] rounded-full font-bold shadow-sm border border-red-200 animate-pulse-subtle">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full"></span>
                  Follow-Up
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}