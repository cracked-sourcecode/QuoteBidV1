import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SignupStage, getSignupEmail, getUserSignupStage } from '@/lib/signup-wizard';

interface SignupWizardContextType {
  currentStage: SignupStage;
  setStage: (stage: SignupStage) => void;
  refreshStage: () => Promise<void>;
  email: string | null;
}

const SignupWizardContext = createContext<SignupWizardContextType | undefined>(undefined);

export function SignupWizardProvider({ children }: { children: ReactNode }) {
  const [currentStage, setCurrentStage] = useState<SignupStage>('payment');
  const STAGE_ORDER: SignupStage[] = ['payment', 'profile', 'ready'];
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Initialize email from localStorage
    const storedEmail = getSignupEmail();
    if (storedEmail) {
      setEmail(storedEmail);
    }
    
    // Initialize current stage from API
    refreshStage();
  }, []);

  const refreshStage = async () => {
    const storedEmail = getSignupEmail();
    if (!storedEmail) return;
    
    try {
      const stageInfo = await getUserSignupStage(storedEmail);
      console.log('[SignupWizardContext] Backend returned stage:', stageInfo.stage);
      // If the backend returns an invalid or missing stage, default to 'payment'
      const validStages = ['payment', 'profile', 'ready'];
      if (!stageInfo.stage || !validStages.includes(stageInfo.stage)) {
        console.warn('[SignupWizardContext] Invalid or missing stage from backend, defaulting to payment');
        setCurrentStage('payment');
      } else {
        setCurrentStage(stageInfo.stage);
      }

      // Update highest step in localStorage
      const stageToStep = (stage: SignupStage) => {
        switch (stage) {
          case 'payment': return 1;
          case 'profile': return 2;
          case 'ready': return 3;
          default: return 1;
        }
      };

      const currentStep = stageToStep(stageInfo.stage);
      const highestStep = parseInt(localStorage.getItem('signup_highest_step') || '1');
      
      if (currentStep > highestStep) {
        localStorage.setItem('signup_highest_step', String(currentStep));
      }
    } catch (error) {
      console.error('Error fetching current signup stage:', error);
      setCurrentStage('payment');
    }
  };

  const setStage = (stage: SignupStage) => {
    if (!STAGE_ORDER.includes(stage)) {
      console.warn(`[SignupWizardContext] Invalid stage: ${stage}`);
      return;
    }
    setCurrentStage(prev => {
      const prevIndex = STAGE_ORDER.indexOf(prev);
      const newIndex = STAGE_ORDER.indexOf(stage);
      if (newIndex < prevIndex) {
        console.warn(`[SignupWizardContext] Attempted to regress stage from ${prev} to ${stage}`);
        return prev;
      }
      return stage;
    });
    
    // Update highest step in localStorage
    const stageToStep = (stage: SignupStage) => {
      switch (stage) {
        case 'payment': return 1;
        case 'profile': return 2;
        case 'ready': return 3;
        default: return 1;
      }
    };

    const newStep = stageToStep(stage);
    const highestStep = parseInt(localStorage.getItem('signup_highest_step') || '1');
    
    if (newStep > highestStep) {
      localStorage.setItem('signup_highest_step', String(newStep));
    }
  };

  const value = {
    currentStage,
    setStage,
    refreshStage,
    email
  };

  return (
    <SignupWizardContext.Provider value={value}>
      {children}
    </SignupWizardContext.Provider>
  );
}

export function useSignupWizard() {
  const context = useContext(SignupWizardContext);
  if (context === undefined) {
    throw new Error('useSignupWizard must be used within a SignupWizardProvider');
  }
  return context;
}