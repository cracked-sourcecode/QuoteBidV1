import React from 'react';
import { Section, Text } from '@react-email/components';

interface EmailFooterProps {
  frontendUrl?: string;
}

export default function EmailFooter({ frontendUrl = 'http://localhost:5050' }: EmailFooterProps) {
  return (
    <Section style={{
      textAlign: 'center',
      padding: '32px 0',
    }}>
      {/* Main Brand Statement */}
      <Text style={{
        color: '#ffffff',
        fontSize: '16px',
        margin: '0 0 20px 0',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '600',
      }}>
        QuoteBid — Built for experts, not PR agencies.
      </Text>

      {/* Navigation Links */}
      <Text style={{
        color: '#94a3b8',
        fontSize: '14px',
        margin: '0 0 16px 0',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '500',
      }}>
        <a 
          href={`${frontendUrl}/platform`} 
          style={{ 
            color: '#94a3b8', 
            textDecoration: 'none',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Platform
        </a>
        {' • '}
        <a 
          href={`${frontendUrl}/privacy`} 
          style={{ 
            color: '#94a3b8', 
            textDecoration: 'none',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Privacy
        </a>
        {' • '}
        <a 
          href={`${frontendUrl}/unsubscribe`} 
          style={{ 
            color: '#94a3b8', 
            textDecoration: 'none',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Unsubscribe
        </a>
      </Text>

      {/* Copyright */}
      <Text style={{
        color: '#64748b',
        fontSize: '12px',
        margin: '0',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '500',
      }}>
        © 2025 QuoteBid Inc. • Revolutionizing earned media.
      </Text>
    </Section>
  );
} 