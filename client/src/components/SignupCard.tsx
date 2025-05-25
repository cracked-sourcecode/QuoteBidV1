import React from 'react';

export default function SignupCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-[460px] max-w-full flex flex-col gap-6 min-h-[540px] rounded-xl px-8 py-10 shadow-lg ${className}`}
      style={{ background: '#fff' }}
    >
      {children}
    </div>
  );
} 