import React from 'react';
import {
  Html,
  Head,
  Body,
} from '@react-email/components';
import EmailFooter from '../components/EmailFooter';

interface LiveOpportunity {
  id: number;
  title: string;
  description: string;
  outlet: string;
  logo: string;
  bgColor: string;
  tier: string;
  category: string;
  price: string;
  trend: string;
  timeLeft: string;
  industry: string;
  publicationId: number;
}

interface WelcomeEmailProps {
  userFirstName: string;
  username: string;
  frontendUrl: string;
  industry?: string;
  liveOpportunity?: LiveOpportunity | null;
}

export default function WelcomeEmail({
  userFirstName,
  frontendUrl,
}: WelcomeEmailProps) {
  
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to QuoteBid!</title>
      </Head>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        
        {/* Header */}
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#1e293b' }}>
          <tr>
            <td style={{ padding: '40px 20px', textAlign: 'center' }}>
              <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Quote<span style={{ color: '#3b82f6' }}>Bid</span> <span style={{ backgroundColor: '#3b82f6', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>BETA</span>
              </h1>
              <h2 style={{ color: '#ffffff', fontSize: '20px', margin: '0' }}>Welcome to QuoteBid! 🎉</h2>
            </td>
          </tr>
        </table>

        {/* Main Content */}
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td style={{ padding: '40px 20px' }}>
              <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                
                <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#374151' }}>
                  Hi {userFirstName},
                </p>
                
                <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 16px 0', color: '#4b5563' }}>
                  You've just joined <strong>The World's First Live Marketplace for Earned Media</strong> — built for experts, not PR agencies.
                </p>
                
                <p style={{ fontSize: '16px', lineHeight: '1.5', margin: '0 0 24px 0', color: '#4b5563' }}>
                  QuoteBid gives you direct access to live editorial opportunities, priced by real-time market demand. No retainers. No agencies. No static prices.
                </p>

                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', margin: '0 0 32px 0', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', color: '#1e293b' }}>
                    Every pitch is a bid. And you only pay if you're published.
                  </p>
                </div>

                {/* Opportunity Card - Exact Design from Screenshots */}
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', margin: '0 0 32px 0', border: '1px solid #e2e8f0' }}>
                  <div style={{ textAlign: 'center', margin: '0 0 20px 0' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>
                      📈 Live Opportunity in Your Industry
                    </h3>
                    <p style={{ fontSize: '14px', margin: '0', color: '#6b7280' }}>
                      Here's a current opportunity matching your Capital Markets expertise:
                    </p>
                  </div>
                  
                  {/* Publication Card */}
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    
                    {/* Header with Logo and Tier */}
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '16px' }}>
                      <tr>
                        <td style={{ verticalAlign: 'middle' }}>
                          <table cellPadding="0" cellSpacing="0">
                            <tr>
                              <td style={{ paddingRight: '12px', verticalAlign: 'middle' }}>
                                <div style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  backgroundColor: '#000000', 
                                  borderRadius: '6px', 
                                  display: 'inline-block',
                                  textAlign: 'center',
                                  lineHeight: '40px',
                                  color: '#ffffff',
                                  fontSize: '18px',
                                  fontWeight: 'bold'
                                }}>B</div>
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 2px 0' }}>Bloomberg</div>
                                <div style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>Expert Request</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{ 
                            backgroundColor: '#3b82f6', 
                            color: '#ffffff', 
                            padding: '6px 12px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: 'bold',
                            display: 'inline-block'
                          }}>
                            Tier 2
                          </span>
                        </td>
                      </tr>
                    </table>

                    <div style={{ margin: '0 0 12px 0' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        color: '#3b82f6'
                      }}>
                        EXPERT REQUEST
                      </span>
                    </div>
                    
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#1e293b', lineHeight: '1.3' }}>
                      Banking Experts for FOMC Meeting Analysis
                    </h4>
                    
                    <p style={{ fontSize: '14px', margin: '0 0 16px 0', color: '#4b5563', lineHeight: '1.5' }}>
                      Banking Experts: Do you think the next FOMC meeting will result in a rate hike or cut? Market analysis needed...
                    </p>
                    
                    <div style={{ margin: '0 0 20px 0' }}>
                      <span style={{ 
                        backgroundColor: '#dbeafe', 
                        color: '#1e40af', 
                        padding: '6px 12px', 
                        borderRadius: '16px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        display: 'inline-block'
                      }}>
                        Capital Markets
                      </span>
                    </div>
                    
                    {/* Price Section */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '0 0 20px 0' }}>
                      <table width="100%" cellPadding="0" cellSpacing="0">
                        <tr>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Current Price</div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>$285</div>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <div style={{ 
                              backgroundColor: '#dcfce7', 
                              color: '#15803d', 
                              padding: '8px 12px', 
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              display: 'inline-block'
                            }}>
                              📈 +$32 past hour
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style={{ textAlign: 'center', margin: '0 0 20px 0' }}>
                      <a href={`${frontendUrl}/opportunities`} style={{ 
                        backgroundColor: '#3b82f6', 
                        color: '#ffffff', 
                        textDecoration: 'none', 
                        padding: '14px 28px', 
                        borderRadius: '8px', 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        display: 'inline-block'
                      }}>
                        🎯 Pitch Now at $285
                      </a>
                    </div>
                    
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td style={{ width: '33%', textAlign: 'left' }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>⏰ 2 days left</span>
                        </td>
                        <td style={{ width: '33%', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>🔥 Hot</span>
                        </td>
                        <td style={{ width: '33%', textAlign: 'right' }}>
                          <a href={`${frontendUrl}/opportunities`} style={{ color: '#3b82f6', fontSize: '12px', textDecoration: 'none' }}>View Details</a>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>

                {/* How It Works */}
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', margin: '0 0 32px 0', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px 0', color: '#1e293b', textAlign: 'center' }}>
                    How QuoteBid Works
                  </h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td style={{ width: '30px', verticalAlign: 'top', paddingTop: '2px' }}>
                          <span style={{ backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-block', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', lineHeight: '24px' }}>1</span>
                        </td>
                        <td style={{ paddingLeft: '12px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e293b' }}>Browse Live Editorial Opportunities</p>
                          <p style={{ fontSize: '13px', margin: '0', color: '#4b5563', lineHeight: '1.4' }}>See verified, time-sensitive media openings — sorted by category, tiered by value, and updated in real time.</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td style={{ width: '30px', verticalAlign: 'top', paddingTop: '2px' }}>
                          <span style={{ backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-block', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', lineHeight: '24px' }}>2</span>
                        </td>
                        <td style={{ paddingLeft: '12px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e293b' }}>Bid at the Market Price</p>
                          <p style={{ fontSize: '13px', margin: '0', color: '#4b5563', lineHeight: '1.4' }}>Every story has a live price set by demand. Submit your pitch — by voice or text — at the current rate.</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <div>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td style={{ width: '30px', verticalAlign: 'top', paddingTop: '2px' }}>
                          <span style={{ backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-block', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', lineHeight: '24px' }}>3</span>
                        </td>
                        <td style={{ paddingLeft: '12px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e293b' }}>Pay Only if You're Published</p>
                          <p style={{ fontSize: '13px', margin: '0', color: '#4b5563', lineHeight: '1.4' }}>If your quote is selected and runs in the final article, you're charged your locked-in bid. If not, you pay nothing.</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>

                {/* Final CTA */}
                <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
                  <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
                    Ready to Start Bidding?
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px 0' }}>
                    Browse 20+ active opportunities right now. Prices updating live.
                  </p>
                  <a href={`${frontendUrl}/opportunities`} style={{ backgroundColor: '#3b82f6', color: '#ffffff', textDecoration: 'none', padding: '16px 32px', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', display: 'inline-block' }}>
                    Enter the Marketplace →
                  </a>
                </div>

              </div>
            </td>
          </tr>
        </table>

        <EmailFooter frontendUrl={frontendUrl} />

      </Body>
    </Html>
  );
} 