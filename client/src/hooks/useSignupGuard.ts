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
            // case 'agreement':
            //   return 1;
            case 'payment':
              return 1;
            case 'profile':
              return 2;
            case 'ready':
              return 'dashboard';
            default:
              return 1;
          }
        };
        const step = stageToStep(data.stage);
        if (typeof step === 'number' && step > highestStep) {
          localStorage.setItem('signup_highest_step', String(step));
        }
        if (data.stage === 'COMPLETED') {
          setLocation('/dashboard', { replace: true });
          return;
        }
        if (data.stage !== requiredStage) {
          setLocation(`/auth?tab=signup&step=${step}`, { replace: true });
        }
      })
      .catch((err) => {
        // If not authenticated, redirect to register
        if (err.message && err.message.includes('401')) {
          setLocation('/auth?tab=register', { replace: true });
        }
      });
  }, [requiredStage, setLocation]);
}
