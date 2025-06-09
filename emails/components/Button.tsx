import React from 'react';
import { Button as ReactEmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  href, 
  children, 
  variant = 'primary',
  size = 'md' 
}: ButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = {
      display: 'inline-block',
      textDecoration: 'none',
      textAlign: 'center' as const,
      fontWeight: '600',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.2s ease',
    };

    const sizeStyles = {
      sm: { padding: '8px 16px', fontSize: '14px', lineHeight: '20px' },
      md: { padding: '12px 24px', fontSize: '16px', lineHeight: '24px' },
      lg: { padding: '16px 32px', fontSize: '18px', lineHeight: '28px' },
    };

    const variantStyles = {
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      secondary: {
        backgroundColor: '#ffffff',
        color: '#374151',
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <ReactEmailButton
      href={href}
      style={getButtonStyles()}
    >
      {children}
    </ReactEmailButton>
  );
} 