import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, Send, Award, PenSquare, HandIcon } from "lucide-react";

export type PitchStatus = 
  | 'draft' 
  | 'pending' 
  | 'sent_to_reporter' 
  | 'sent' // Legacy alias for sent_to_reporter
  | 'reporter_interested' 
  | 'interested' // Legacy alias
  | 'reporter_not_interested'
  | 'not_interested' // Legacy alias
  | 'successful_coverage'
  | 'successful'; // Legacy alias

export interface PitchDTO {
  id: number;
  userId: number;  // Add userId for type compatibility with PitchEditModal
  content: string;
  status: PitchStatus;
  bidAmount: number;
  createdAt: string;
  updatedAt?: string;
  opportunityId: number;
  // Payment information
  paymentIntentId?: string | null;
  // Remove legacy flags in the future
  isDraft?: boolean;
  opportunity?: {
    title: string;
    outlet?: string;
    publication?: {
      name: string;
      logo?: string;
    }
  };
  publication?: {
    name: string;
    logo?: string;
  };
  needsFollowUp?: boolean;
  article?: {
    title?: string;
    url: string;
  };
}

// Get the canonical status from a pitch - single source of truth
export function getStage(pitch: PitchDTO): PitchStatus {
  console.log("getStage processing pitch:", { 
    id: pitch.id, 
    status: pitch.status, 
    isDraft: pitch.isDraft, 
    hasPaymentIntent: !!pitch.paymentIntentId 
  });
  
  // CRITICAL FIX: Respect the actual status from the database
  // If status is 'draft', it should remain 'draft' regardless of having an ID
  // The previous logic was incorrectly forcing drafts to 'pending' status
    if (pitch.status === 'draft') {
    return 'draft';
  }
  
  // Normalize legacy status names to the new canonical ones
  switch (pitch.status) {
    case 'sent': return 'sent_to_reporter';
    case 'interested': return 'reporter_interested';
    case 'not_interested': return 'reporter_not_interested';
    case 'successful': return 'successful_coverage';
    default: return pitch.status;
  }
}

// Determine if a pitch can be edited
export function canEditPitch(pitch: PitchDTO): boolean {
  const stage = getStage(pitch);
  return stage === 'draft' || stage === 'pending';
}

// UI assets and copy text for each status
export const stageCopy = {
  draft: {
    label: "Draft",
    color: "bg-gray-50 text-gray-700",
    iconType: "draft",
    description: "Your pitch is saved as a draft. Complete and submit it to be considered for this opportunity.",
    banner: "In-progress pitch: complete your pitch!",
    action: "Edit Draft",
    nextSteps: "Your pitch is in draft status. Complete it and submit to be considered by the reporter."
  },
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700",
    iconType: "pending",
    description: "Your pitch is pending internal review. Feel free to tweak any details before we push it live.",
    banner: "Pitch received – you can still edit until we send it to the reporter.",
    action: "Edit Pitch",
    nextSteps: "Your pitch is pending internal review. Feel free to tweak any details before we push it live."
  },
  sent_to_reporter: {
    label: "Sent to Reporter",
    color: "bg-blue-50 text-blue-700",
    iconType: "sent",
    description: "Your pitch has been sent to the reporter and is being reviewed. We'll notify you of any updates.",
    banner: "Pitch sent – awaiting reporter feedback.",
    action: null,
    nextSteps: "We've launched your pitch. We'll notify you as soon as the reporter responds."
  },
  reporter_interested: {
    label: "Reporter Interested",
    color: "bg-yellow-50 text-yellow-700",
    iconType: "interested",
    description: "Great news! The reporter is interested in your pitch. They may follow up with additional questions.",
    banner: "Reporter is interested! They may reach out with additional questions.",
    action: null,
    nextSteps: "The reporter is interested in your expertise. We'll help coordinate next steps."
  },
  reporter_not_interested: {
    label: "Not Interested",
    color: "bg-red-50 text-red-700",
    iconType: "rejected",
    description: "The reporter has passed on this pitch. Don't worry - there are many other opportunities!",
    banner: "Reporter passed on this opportunity.",
    action: null,
    nextSteps: "This reporter passed on your pitch. Consider browsing other opportunities that match your expertise."
  },
  successful_coverage: {
    label: "Successful Placement",
    color: "bg-green-50 text-green-700",
    iconType: "successful",
    description: "Congratulations! Your pitch has been published. Your expertise is featured in the publication.",
    banner: "Success! Your expertise is now published.",
    action: null,
    nextSteps: "Congratulations! Your expertise has been featured in the publication."
  }
} as const;

// We don't directly include JSX in the utility functions to avoid circular dependencies
// Instead, we return the type of icon that should be shown
export function getIconType(stage: PitchStatus): string {
  switch (stage) {
    case 'draft': return 'draft';
    case 'pending': return 'pending';
    case 'sent_to_reporter': return 'sent';
    case 'sent': return 'sent';
    case 'reporter_interested': return 'interested';
    case 'interested': return 'interested';
    case 'reporter_not_interested': return 'rejected';
    case 'not_interested': return 'rejected';
    case 'successful_coverage': return 'successful';
    case 'successful': return 'successful';
    default: return 'pending';
  }
}

// Get formatted timestamps for the progress tracker
export function getStageTimestamps(pitch: PitchDTO) {
  const stage = getStage(pitch);
  
  return {
    draft: stage === 'draft' ? new Date(pitch.createdAt) : undefined,
    pending: stage !== 'draft' ? new Date(pitch.createdAt) : undefined,
    sent_to_reporter: (stage !== 'draft' && stage !== 'pending') 
      ? new Date(pitch.updatedAt || pitch.createdAt) 
      : undefined,
    reporter_interested: (stage === 'reporter_interested' || stage === 'successful_coverage') 
      ? new Date(pitch.updatedAt || pitch.createdAt) 
      : undefined,
    successful_coverage: stage === 'successful_coverage' 
      ? new Date(pitch.updatedAt || pitch.createdAt) 
      : undefined,
  };
}

// Get the publication name in a consistent way
export function getPublicationName(pitch: PitchDTO): string {
  return pitch.publication?.name || 
         pitch.opportunity?.publication?.name || 
         pitch.opportunity?.outlet || 
         "Unknown Publication";
}

// Format a nice date string for display
export function getFormattedDate(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy");
}