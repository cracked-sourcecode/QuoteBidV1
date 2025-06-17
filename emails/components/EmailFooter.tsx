import React from 'react';

interface EmailFooterProps {
  frontendUrl: string;
}

export default function EmailFooter({ frontendUrl }: EmailFooterProps) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f8fafc', padding: '40px 20px' }}>
      <tr>
        <td style={{ textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>
              Quote<span style={{ color: '#3b82f6' }}>Bid</span> <span style={{ backgroundColor: '#3b82f6', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>BETA</span>
            </h3>
            
            <p style={{ fontSize: '14px', margin: '0 0 20px 0', color: '#6b7280' }}>
              The World's First Live Marketplace for Earned Media
            </p>
            
            <a 
              href={`${frontendUrl}/email-preferences`} 
              style={{ 
                backgroundColor: '#3b82f6', 
                color: '#ffffff', 
                textDecoration: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: '600',
                display: 'inline-block',
                margin: '0 0 20px 0'
              }}
            >
              Manage Email Preferences
            </a>
            
            <div style={{ margin: '0 0 16px 0' }}>
              <a href={`${frontendUrl}/terms`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', margin: '0 8px' }}>Terms</a>
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>|</span>
              <a href={`${frontendUrl}/privacy`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', margin: '0 8px' }}>Privacy</a>
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>|</span>
              <a href={`${frontendUrl}/editorial-integrity`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', margin: '0 8px' }}>Editorial Integrity</a>
            </div>
            
            <p style={{ fontSize: '12px', margin: '0 0 4px 0', color: '#6b7280' }}>
              © 2025 QuoteBid Inc. All rights reserved.
            </p>
            <p style={{ fontSize: '12px', margin: '0', color: '#6b7280' }}>
              Built For Experts, Not PR Agencies.
            </p>
            
          </div>
        </td>
      </tr>
    </table>
  );
} 