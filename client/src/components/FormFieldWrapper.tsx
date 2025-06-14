import React from 'react';

interface Props {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export default function Field({ children, error, className }: Props) {
  return (
    <div className={`relative flex flex-col ${className ?? ''}`}>
      {children}
      <p className="text-xs text-red-500 font-normal leading-tight max-w-full mt-1 min-h-[16px]">
        {error || ''}
      </p>
    </div>
  );
} 