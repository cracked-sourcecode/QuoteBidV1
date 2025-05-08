import React from 'react';
import PitchProgressTracker from './pitch-progress-tracker';
import { PitchStatus } from '@/utils/pitchStage';

// Simple Jest snapshot test file for the PitchStepper component
// This can be run with the Jest testing framework

export function createSnapshotTest(stage: PitchStatus) {
  return (
    <PitchProgressTracker 
      currentStage={stage} 
      pitch={{ paymentIntentId: 'pi_test123' }}
    />
  );
}

// Export test instances for each stage
export const DraftStage = () => createSnapshotTest('draft');
export const PendingStage = () => createSnapshotTest('pending');
export const SentStage = () => createSnapshotTest('sent_to_reporter');
export const InterestedStage = () => createSnapshotTest('reporter_interested');
export const DeclinedStage = () => createSnapshotTest('reporter_not_interested');
export const SuccessfulStage = () => createSnapshotTest('successful_coverage');

// A follow-up badge example
export const InterestedWithFollowUp = () => (
  <PitchProgressTracker 
    currentStage='reporter_interested'
    needsFollowUp={true} 
    pitch={{ paymentIntentId: 'pi_test123' }} 
  />
);