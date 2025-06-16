import React from "react";
import { format } from 'date-fns';
import { Check, Clock, Send, Eye, Award, XCircle } from "lucide-react";
import clsx from "clsx";

// Import the canonical PitchStatus type
import { PitchStatus } from "@/utils/pitchStage";

// Linear progression stages (before branching)
const LINEAR_STAGES = [
  { key: 'submitted', label: 'Submitted', icon: Clock },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'interested', label: 'Interested', icon: Eye }
];

// Branching outcomes
const OUTCOME_BRANCHES = [
  { key: 'published', label: 'Published', icon: Award, type: 'success' },
  { key: 'declined', label: 'Not Selected', icon: XCircle, type: 'declined' }
];

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
  currentStage, 
  stageTimestamps = {},
  needsFollowUp = false,
  pitch 
}: DarkPitchProgressTrackerProps) {
  
  // Simple, clear logic for determining progress
  const getProgressInfo = (status: PitchStatus) => {
    switch (status) {
      case 'draft':
      case 'pending':
        return { activeIndex: 0, isDeclined: false, isSuccessful: false, showBranches: false };
        
      case 'sent':
      case 'sent_to_reporter':
        return { activeIndex: 1, isDeclined: false, isSuccessful: false, showBranches: false };
        
      case 'interested':
      case 'reporter_interested':
        return { activeIndex: 2, isDeclined: false, isSuccessful: false, showBranches: true };
        
      case 'not_interested':
      case 'reporter_not_interested':
        return { activeIndex: 2, isDeclined: true, isSuccessful: false, showBranches: true };
        
      case 'successful':
      case 'successful_coverage':
        return { activeIndex: 2, isDeclined: false, isSuccessful: true, showBranches: true };
        
      default:
        return { activeIndex: 0, isDeclined: false, isSuccessful: false, showBranches: false };
    }
  };

  const { activeIndex, isDeclined, isSuccessful, showBranches } = getProgressInfo(currentStage);

  return (
    <div className="w-full">
      {/* Linear Progress - First 3 stages */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          {LINEAR_STAGES.map((stage, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isActive = isCompleted || isCurrent;
            
            return (
              <React.Fragment key={stage.key}>
                {/* Step Node */}
                <div className="flex flex-col items-center relative z-10">
                  {/* Modern Icon Container */}
                  <div className={`
                    relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3
                    ${isCompleted ? 'bg-blue-500 shadow-lg shadow-blue-500/25' :
                      isCurrent ? 'bg-blue-500/15 border-2 border-blue-500 shadow-lg shadow-blue-500/10' :
                      'bg-slate-700/10 border border-slate-600/30'
                    }
                  `}>
                    {isCompleted ? (
                      <Check className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    ) : (
                      <stage.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${
                        isCurrent ? 'text-blue-500' : 'text-slate-400'
                      }`} />
                    )}
                    
                    {/* Active Indicator Dot */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400" />
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <span className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </span>
                  
                  {/* Action Badge */}
                  {needsFollowUp && stage.key === 'interested' && isCurrent && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                  )}
                </div>
                
                {/* Connection Line */}
                {index < LINEAR_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 relative">
                    <div className="absolute inset-0 bg-slate-600/20 rounded-full" />
                    <div className={`absolute inset-0 rounded-full bg-blue-500`} style={{
                      width: index < activeIndex ? '100%' : '0%'
                    }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Branching Outcomes - Show after "Interested" stage */}
      {showBranches && (
        <div className="relative">
          {/* Branching Connector */}
          <div className="flex justify-center mb-4">
            <div className="w-px h-6 bg-slate-600/30"></div>
          </div>
          
          {/* Two Outcome Branches */}
          <div className="flex items-center justify-between gap-8">
            {OUTCOME_BRANCHES.map((outcome) => {
              const isThisOutcome = (outcome.type === 'success' && isSuccessful) || 
                                   (outcome.type === 'declined' && isDeclined);
              const isActive = isThisOutcome;
              const isInactive = showBranches && !isThisOutcome;
              
              return (
                <div key={outcome.key} className="flex flex-col items-center relative z-10 flex-1">
                  {/* Connecting Line to Center */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <div className={`w-px h-6 ${
                      isActive ? (
                        outcome.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                      ) : 'bg-slate-600/20'
                    }`}></div>
                  </div>
                  
                  {/* Outcome Node */}
                  <div className={`
                    relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3
                    ${isActive ? (
                      outcome.type === 'success' 
                        ? 'bg-green-500 shadow-lg shadow-green-500/25' 
                        : 'bg-red-500 shadow-lg shadow-red-500/25'
                    ) : isInactive ? (
                      'bg-slate-700/5 border border-slate-600/20'
                    ) : (
                      'bg-slate-700/10 border border-slate-600/30'
                    )}
                  `}>
                    {isActive ? (
                      <Check className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    ) : (
                      <outcome.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${
                        isInactive ? 'text-slate-500' : 'text-slate-400'
                      }`} />
                    )}
                    
                    {/* Active Indicator Dot */}
                    {isActive && (
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                        outcome.type === 'success' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    )}
                  </div>
                  
                  {/* Outcome Label */}
                  <span className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
                    isActive ? (
                      outcome.type === 'success' ? 'text-green-400' : 'text-red-400'
                    ) : isInactive ? (
                      'text-slate-500'
                    ) : (
                      'text-slate-400'
                    )
                  }`}>
                    {outcome.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 