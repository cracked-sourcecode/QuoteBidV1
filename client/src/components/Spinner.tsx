import { Loader2 } from 'lucide-react';

export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-sm text-gray-500">Loading...</p>
    </div>
  );
}
