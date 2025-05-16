import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { get } from '@/lib/api';

export function useSignupGuard(requiredStage: string) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    get('/api/auth/progress')
      .then(({ data }) => {
        if (data.stage !== requiredStage) {
          // Map stage to step number
          const enumToStep = (stage: string) => {
            switch (stage) {
              case 'REGISTERED': return 1;
              case 'AGREEMENT': return 2;
              case 'SUBSCRIPTION':
              case 'PROFILE': return 3;
              case 'COMPLETED': return 'dashboard';
              default: return 1;
            }
          };
          if (data.stage === 'COMPLETED') {
            setLocation('/dashboard');
          } else {
            setLocation(`/auth?tab=signup&step=${enumToStep(data.stage)}`);
          }
        }
      })
      .catch((err) => {
        // If not authenticated, redirect to register
        if (err.message && err.message.includes('401')) {
          setLocation('/auth?tab=register');
        }
      });
  }, [requiredStage, setLocation]);
} 