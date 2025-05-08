import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

type ErrorStateProps = {
  err: Error;
  message?: string;
};

export function ErrorState({ err, message }: ErrorStateProps) {
  const [_, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-red-500 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>

        <h3 className="text-lg font-medium text-red-800 mb-2">
          {message || 'Something went wrong'}
        </h3>

        <p className="text-sm text-red-600 mb-4">
          {err.message || 'An unexpected error occurred. Please try again later.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-50"
          >
            Refresh Page
          </Button>
          <Button onClick={() => navigate('/opportunities')}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
