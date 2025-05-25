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
      <p className="absolute -bottom-5 left-0 text-xs text-red-500 min-h-[16px] font-normal">
        {error || ''}
      </p>
    </div>
  );
} 