import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { get } from '@/lib/api';

export function useSignupGuard(requiredStage: string) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get current step from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentStep = parseInt(urlParams.get('step') || '1');
    
    // Get highest step from localStorage
    const highestStep = parseInt(localStorage.getItem('signup_highest_step') || '1');

    // If trying to go back, force forward
    if (currentStep < highestStep) {
      setLocation(`/auth?tab=signup&step=${highestStep}`, { replace: true });
      return;
    }

    // Check server-side progress
    get('/api/auth/progress')
      .then(({ data }) => {
        // Map stage to step number
        const stageToStep = (stage: string) => {
          switch (stage) {
            case 'REGISTERED': return 1;
            case 'AGREEMENT': return 2;
            case 'SUBSCRIPTION':
            case 'PROFILE': return 3;
            case 'COMPLETED': return 'dashboard';
            default: return 1;
          }
        };

        const serverStep = stageToStep(data.stage);
        
        // If server step is ahead, update local storage
        if (typeof serverStep === 'number' && serverStep > highestStep) {
          localStorage.setItem('signup_highest_step', String(serverStep));
        }

        // If completed, go to dashboard
        if (data.stage === 'COMPLETED') {
          setLocation('/dashboard', { replace: true });
          return;
        }

        // If on wrong step, redirect
        if (data.stage !== requiredStage) {
          setLocation(`/auth?tab=signup&step=${stageToStep(data.stage)}`, { replace: true });
        }
      })
      .catch((err) => {
        // If not authenticated, redirect to register
        if (err.message?.includes('401')) {
          setLocation('/auth?tab=register', { replace: true });
        }
      });
  }, [requiredStage, setLocation]);
} 