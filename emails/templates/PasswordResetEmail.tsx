import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
} from '@react-email/components';
import EmailFooter from '../components/EmailFooter';

interface PasswordResetEmailProps {
  userFirstName?: string;
  username?: string;
  resetUrl: string;
  frontendUrl: string;
}

export default function PasswordResetEmail({
  userFirstName,
  username,
  resetUrl,
  frontendUrl,
}: PasswordResetEmailProps) {
  
  const displayName = userFirstName || username || 'there';

  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <Body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          
          {/* Header Section */}
          <Section style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #8b5cf6 100%)',
            borderRadius: '24px 24px 0 0',
            padding: '40px 32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ marginBottom: '16px', fontSize: '32px' }}>
              🔐
            </div>
            <Heading style={{
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: '800',
              margin: '0 0 8px 0',
              lineHeight: '1.2',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.02em',
            }}>
              Password Reset Request
            </Heading>
            <Text style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '16px',
              margin: '0',
              fontWeight: '500',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
              QuoteBid Security Team
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #4c1d95 20%, #581c87 100%)',
            borderRadius: '0 0 24px 24px',
            padding: '40px 32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: 'none',
          }}>
            
            <Text style={{
              color: '#e2e8f0',
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0 0 24px 0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '600',
            }}>
              Hello {displayName},
            </Text>

            <Text style={{
              color: '#cbd5e1',
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0 0 24px 0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '400',
            }}>
              We received a request to reset your QuoteBid account password. If you made this request, click the button below to reset your password:
            </Text>

            {/* Reset Button */}
            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <a href={resetUrl} style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '18px 36px',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '700',
                boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.6), 0 10px 10px -5px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.01em',
              }}>
                🔑 Reset My Password
              </a>
            </div>

            {/* Security Notice */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              margin: '24px 0',
              backdropFilter: 'blur(10px)',
            }}>
              <Text style={{
                color: '#fbbf24',
                fontSize: '14px',
                fontWeight: '700',
                margin: '0 0 8px 0',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}>
                ⚠️ Security Notice
              </Text>
              <Text style={{
                color: '#fde68a',
                fontSize: '14px',
                margin: '0',
                lineHeight: '1.4',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '500',
              }}>
                This link will expire in 1 hour for security reasons.
              </Text>
            </div>

            <Text style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '24px 0 0 0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '400',
            }}>
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </Text>

            <Text style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '8px 0 0 0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '400',
            }}>
              For security, this reset link can only be used once.
            </Text>

            {/* Alternative Link */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              margin: '24px 0',
              backdropFilter: 'blur(10px)',
            }}>
              <Text style={{
                color: '#cbd5e1',
                fontSize: '12px',
                margin: '0 0 8px 0',
                fontWeight: '600',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}>
                If the button doesn't work, copy and paste this link:
              </Text>
              <Text style={{
                color: '#60a5fa',
                fontSize: '12px',
                margin: '0',
                wordBreak: 'break-all',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '400',
              }}>
                {resetUrl}
              </Text>
            </div>
          </Section>

          {/* Support Contact */}
          <Section style={{
            textAlign: 'center',
            padding: '24px 0 0 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <Text style={{
              color: '#cbd5e1',
              fontSize: '14px',
              margin: '0 0 32px 0',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '500',
            }}>
              Need help? Contact our support team at{' '}
              <a href="mailto:support@quotebid.com" style={{ 
                color: '#60a5fa', 
                textDecoration: 'none',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '600'
              }}>
                support@quotebid.com
              </a>
            </Text>
          </Section>

          {/* Global Footer */}
          <EmailFooter frontendUrl={frontendUrl} />

        </Container>
      </Body>
    </Html>
  );
} 