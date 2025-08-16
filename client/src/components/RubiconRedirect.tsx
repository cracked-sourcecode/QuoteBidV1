import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RubiconRedirectProps {
  type: 'login' | 'register' | 'logout';
}

export function RubiconRedirect({ type }: RubiconRedirectProps) {
  const rubiconBaseUrl = import.meta.env.VITE_RUBICON_BASE_URL || 'https://www.rubiconprgroup.com';
  
  useEffect(() => {
    // Redirect to appropriate Rubicon page
    const redirectUrls = {
      login: `${rubiconBaseUrl}/login`,
      register: `${rubiconBaseUrl}/register`, 
      logout: `${rubiconBaseUrl}/logout`,
    };

    // Small delay to show the loading message
    const timer = setTimeout(() => {
      window.location.href = redirectUrls[type];
    }, 1000);

    return () => clearTimeout(timer);
  }, [type, rubiconBaseUrl]);

  const messages = {
    login: 'Redirecting to Rubicon login...',
    register: 'Redirecting to Rubicon registration...',
    logout: 'Logging out via Rubicon...',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">
            Rubicon Integration
          </h1>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <p className="text-slate-300">
              {messages[type]}
            </p>
          </div>
          
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              QuoteBid authentication is handled by Rubicon PR Group.
            </p>
            <p>
              You'll be redirected to complete your {type} there.
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              If you're not redirected automatically,{' '}
              <a 
                href={`${rubiconBaseUrl}/${type}`}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                click here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}