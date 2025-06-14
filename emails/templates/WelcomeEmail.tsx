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

// Industry-specific opportunities
const getIndustryOpportunity = (industry?: string) => {
  const opportunities = {
    'Technology': {
      outlet: 'TechCrunch',
      title: 'AI Startup Experts Needed for Series A Funding Story',
      description: 'Looking for AI startup founders and VCs to comment on the current Series A market dynamics and emerging AI technologies...',
      category: '• AI & Startups',
      price: '$342',
      trend: '+$45 past hour',
      timeLeft: '2 days left',
      tier: 'Tier 1',
      bgColor: '#1f2937', // dark gray
      logo: 'T'
    },
    'Finance': {
      outlet: 'Bloomberg',
      title: 'Banking Experts for FOMC Meeting Analysis',
      description: 'Banking Experts: Do you think the next FOMC meeting will result in a rate hike or cut? Market analysis needed...',
      category: '• Capital Markets',
      price: '$285',
      trend: '+$32 past hour',
      timeLeft: '3 days left',
      tier: 'Tier 1',
      bgColor: '#000000', // black
      logo: 'B'
    },
    'Healthcare': {
      outlet: 'STAT News',
      title: 'Biotech Experts for Drug Approval Pipeline Story',
      description: 'Healthcare professionals needed to discuss FDA drug approval trends and biotech pipeline developments for Q1 2025...',
      category: '• Biotech & Pharma',
      price: '$298',
      trend: '+$28 past hour',
      timeLeft: '4 days left',
      tier: 'Tier 1',
      bgColor: '#dc2626', // red
      logo: 'S'
    },
    'Real Estate': {
      outlet: 'Wall Street Journal',
      title: 'Commercial Real Estate Market Analysis',
      description: 'Real estate experts needed for commercial market trends analysis covering office space, retail, and industrial sectors...',
      category: '• Commercial RE',
      price: '$256',
      trend: '+$18 past hour',
      timeLeft: '5 days left',
      tier: 'Tier 1',
      bgColor: '#059669', // green
      logo: 'W'
    },
    'Energy': {
      outlet: 'Reuters',
      title: 'Renewable Energy Investment Experts Needed',
      description: 'Energy sector analysts needed to discuss renewable energy investment trends and policy impacts on market dynamics...',
      category: '• Energy Markets',
      price: '$267',
      trend: '+$22 past hour',
      timeLeft: '3 days left',
      tier: 'Tier 1',
      bgColor: '#7c3aed', // purple
      logo: 'R'
    },
    'Crypto': {
      outlet: 'CoinDesk',
      title: 'Crypto Market Experts for Institutional Adoption Story',
      description: 'Cryptocurrency experts needed to analyze institutional adoption trends and regulatory landscape developments...',
      category: '• Digital Assets',
      price: '$312',
      trend: '+$38 past hour',
      timeLeft: '2 days left',
      tier: 'Tier 1',
      bgColor: '#ea580c', // orange
      logo: 'C'
    }
  };

  // Return industry-specific opportunity or default to Finance
  return opportunities[industry as keyof typeof opportunities] || opportunities['Finance'];
};

export default function WelcomeEmail({
  userFirstName,
  username,
  frontendUrl,
  industry,
  liveOpportunity,
}: WelcomeEmailProps) {
  
  // Use live opportunity if available, otherwise fall back to static example
  const opportunity = liveOpportunity || getIndustryOpportunity(industry);
  
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to QuoteBid!</title>
      </Head>
      <Body style={main}>
        <Container style={container}>
          
          {/* Animated header with floating elements */}
          <Section style={header}>
            <div style={floatingElement1}></div>
            <div style={floatingElement2}></div>
            <div style={floatingElement3}></div>
            
            <Heading style={logoHeading}>
              ⚡ <span style={quotePart}>Quote</span>
              <span style={bidPart}>Bid</span>
              <span style={betaBadge}>BETA</span>
            </Heading>
            
            <Heading style={welcomeTitle}>
              Welcome to QuoteBid! 🎉
            </Heading>
          </Section>

          <Section style={content}>
            
            {/* Personal welcome */}
            <Section style={welcomeSection}>
              <Text style={greeting}>
                Hi {userFirstName},
              </Text>
              
              <Text style={introText}>
                You've just joined The World's First Live Marketplace for Earned Media — built For Experts, Not PR Agencies.
              </Text>
              
              <Text style={missionText}>
                QuoteBid gives you direct access to live editorial opportunities, priced by real-time market demand.<br />
                No retainers. No agencies. No static prices.<br />
                Every pitch is a bid. And you only pay if you're published.
              </Text>
            </Section>

            {/* Live Opportunity Preview - Industry Specific */}
            <Section style={opportunitySection}>
              <Heading style={sectionTitle}>📈 Live Opportunity in Your Industry</Heading>
              <Text style={opportunitySubtitle}>
                Here's a current opportunity matching your {industry || 'Finance'} expertise:
              </Text>
              
              <div style={opportunityCard}>
                {/* Card Header */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: opportunity.bgColor, 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {opportunity.logo}
                    </div>
                    <div>
                      <div style={{color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: '0'}}>{opportunity.outlet}</div>
                      <div style={{color: '#94a3b8', fontSize: '14px', margin: '0'}}>Expert Request</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '20px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {opportunity.tier}
                  </div>
                </div>
                
                {/* Category */}
                <div style={{marginBottom: '12px'}}>
                  <span style={{
                    color: '#60a5fa',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    EXPERT REQUEST
                  </span>
                </div>
                
                {/* Title */}
                <Text style={opportunityTitle}>
                  {opportunity.title}
                </Text>
                
                {/* Description */}
                <Text style={opportunityDescription}>
                  {opportunity.description}
                </Text>
                
                {/* Category Tag */}
                <div style={{marginBottom: '16px'}}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    backgroundColor: '#3b82f620',
                    color: '#60a5fa',
                    borderRadius: '20px',
                    fontSize: '14px',
                    border: '1px solid #3b82f640'
                  }}>
                    {opportunity.category}
                  </span>
                </div>
                
                {/* Price Section */}
                <div style={{
                  backgroundColor: '#ffffff10',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div>
                      <div style={{color: '#94a3b8', fontSize: '12px', margin: '0 0 4px 0'}}>Current Price</div>
                      <div style={{color: '#ffffff', fontSize: '32px', fontWeight: 'bold', margin: '0'}}>{opportunity.price}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <span style={{color: '#22c55e', fontSize: '14px', fontWeight: '500'}}>📈 {opportunity.trend}</span>
                    </div>
                  </div>
                </div>
                
                {/* Pitch Now Button */}
                <div style={{marginBottom: '16px'}}>
                  <a href={liveOpportunity && liveOpportunity.id > 0 ? `${frontendUrl}/opportunities/${liveOpportunity.id}` : `${frontendUrl}/opportunities`} style={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s ease',
                    border: 'none'
                  }}>
                    🎯 Pitch Now at {opportunity.price}
                  </a>
                </div>
                
                {/* Status */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8'}}>
                    <span>⏰ {opportunity.timeLeft}</span>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#eab30820',
                      color: '#eab308',
                      borderRadius: '12px'
                    }}>
                      🔥 Hot
                    </span>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#3b82f620',
                    color: '#60a5fa',
                    borderRadius: '12px'
                  }}>
                    View Details
                  </span>
                </div>
              </div>
            </Section>

            {/* How QuoteBid Works */}
            <Section style={howItWorksSection}>
              <Heading style={sectionHeading}>
                How QuoteBid Works
              </Heading>
              
              <div style={stepsContainer}>
                <div style={stepCard}>
                  <Text style={stepNumber}>1</Text>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Browse Live Editorial Opportunities</Text>
                    <Text style={stepDescription}>
                      See verified, time-sensitive media openings — sorted by category, tiered by value, and updated in real time.
                    </Text>
                  </div>
                </div>
                
                <div style={stepCard}>
                  <Text style={stepNumber}>2</Text>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Bid at the Market Price</Text>
                    <Text style={stepDescription}>
                      Every story has a live price set by demand. Submit your pitch — by voice or text — at the current rate.
                    </Text>
                  </div>
                </div>
                
                <div style={stepCard}>
                  <Text style={stepNumber}>3</Text>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Pay Only if You're Published</Text>
                    <Text style={stepDescription}>
                      If your quote is selected and runs in the final article, you're charged your locked-in bid. If not, you pay nothing.
                    </Text>
                  </div>
                </div>
                
                <div style={stepCard}>
                  <Text style={stepNumber}>4</Text>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Track Outcomes and Market Movement</Text>
                    <Text style={stepDescription}>
                      Monitor price shifts, watch pitch status, and see which stories are trending — all from your dashboard.
                    </Text>
                  </div>
                </div>
              </div>
            </Section>

            {/* Pro Tips Section */}
            <Section style={proTipsSection}>
              <Heading style={proTipsHeading}>
                💡 Pro Tips for Success
              </Heading>
              
              <div style={tipsGrid}>
                <Text style={tipItem}>
                  <strong>Watch for Price Drops:</strong> Prices adjust in real time — bid when demand softens.
                </Text>
                
                <Text style={tipItem}>
                  <strong>Use Your Voice:</strong> Submit pitches faster and stand out with human delivery.
                </Text>
                
                <Text style={tipItem}>
                  <strong>Bid With Intention:</strong> You set the price — make it count.
                </Text>
                
                <Text style={tipItem}>
                  <strong>Only Pay When It Works:</strong> No retainers. No placements, no cost.
                </Text>
              </div>
            </Section>

            {/* Ultra Modern CTA */}
            <Section style={ctaSection}>
              <Text style={ctaEyebrow}>READY TO TRADE?</Text>
              <Heading style={ctaHeading}>
                Start Bidding on Live Stories
              </Heading>
              <Text style={ctaSubtext}>
                Browse 20+ active opportunities right now. Prices updating live.
              </Text>
              
              <div style={ctaButtonContainer}>
                <a href={`${frontendUrl}/opportunities`} style={ctaButton}>
                  <span style={buttonText}>Enter the Marketplace</span>
                  <span style={buttonArrow}>→</span>
                </a>
              </div>
              
              <Text style={ctaFootnote}>
                💡 Pro tip: Watch for price drops when deadlines approach
              </Text>
            </Section>

          </Section>

          {/* Global Footer */}
          <EmailFooter frontendUrl={frontendUrl} />

        </Container>
      </Body>
    </Html>
  );
}

// ===== BADASS SMOOTH SAAS STYLES =====

const main = {
  backgroundColor: '#0a0a0b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  margin: 0,
  padding: '20px',
  minHeight: '100vh',
  backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)',
};

const container = {
  background: 'linear-gradient(145deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 100%)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  margin: '0 auto',
  maxWidth: '680px',
  overflow: 'hidden',
  boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  position: 'relative' as const,
};

const header = {
  background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.95) 100%)',
  padding: '60px 40px',
  textAlign: 'center' as const,
  position: 'relative' as const,
  overflow: 'hidden',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const floatingElement1 = {
  position: 'absolute' as const,
  top: '20px',
  right: '20px',
  width: '100px',
  height: '100px',
  background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
  borderRadius: '50%',
  filter: 'blur(40px)',
};

const floatingElement2 = {
  position: 'absolute' as const,
  bottom: '30px',
  left: '30px',
  width: '80px',
  height: '80px',
  background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1))',
  borderRadius: '50%',
  filter: 'blur(30px)',
};

const floatingElement3 = {
  position: 'absolute' as const,
  top: '50%',
  left: '10%',
  width: '60px',
  height: '60px',
  background: 'linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(251, 146, 60, 0.1))',
  borderRadius: '50%',
  filter: 'blur(25px)',
};

const logoHeading = {
  margin: '0 0 20px 0',
  fontSize: '48px',
  fontWeight: '900',
  letterSpacing: '-0.04em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap' as const,
};

const quotePart = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const bidPart = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const betaBadge = {
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))',
  border: '1px solid rgba(99, 102, 241, 0.4)',
  borderRadius: '12px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: '800',
  color: '#a5b4fc',
  letterSpacing: '0.1em',
  backdropFilter: 'blur(10px)',
};

const welcomeTitle = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
  lineHeight: '1.2',
};

const content = {
  padding: '0',
};

const welcomeSection = {
  padding: '50px 40px',
  background: 'rgba(255, 255, 255, 0.02)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const greeting = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px 0',
};

const introText = {
  color: '#e2e8f0',
  fontSize: '18px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
  fontWeight: '500',
};

const missionText = {
  color: '#cbd5e1',
  fontSize: '17px',
  lineHeight: '1.7',
  margin: '0',
  padding: '20px',
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
  borderRadius: '16px',
  border: '1px solid rgba(99, 102, 241, 0.2)',
};

const howItWorksSection = {
  padding: '50px 40px',
  background: 'rgba(0, 0, 0, 0.2)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const sectionHeading = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '800',
  margin: '0 0 40px 0',
  textAlign: 'center' as const,
};

const stepsContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px',
};

const stepCard = {
  background: 'rgba(255, 255, 255, 0.04)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '30px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '20px',
  transition: 'all 0.3s ease',
};

const stepNumber = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  color: '#ffffff',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  fontWeight: '800',
  flexShrink: 0,
  margin: '0',
};

const stepContent = {
  flex: '1',
};

const stepTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const stepDescription = {
  color: '#cbd5e1',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
};

const proTipsSection = {
  padding: '50px 40px',
  background: 'rgba(255, 255, 255, 0.02)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const proTipsHeading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 30px 0',
  textAlign: 'center' as const,
};

const tipsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
};

const tipItem = {
  color: '#e2e8f0',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  padding: '16px 20px',
  background: 'rgba(255, 255, 255, 0.04)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const ctaSection = {
  background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #c026d3 100%)',
  padding: '60px 40px',
  textAlign: 'center' as const,
  position: 'relative' as const,
  overflow: 'hidden',
};

const ctaEyebrow = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.15em',
  margin: '0 0 12px 0',
  textTransform: 'uppercase' as const,
};

const ctaHeading = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '900',
  margin: '0 0 16px 0',
  lineHeight: '1.2',
};

const ctaSubtext = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '18px',
  margin: '0 0 32px 0',
  lineHeight: '1.4',
};

const ctaButtonContainer = {
  margin: '0 0 24px 0',
};

const ctaButton = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: '16px',
  color: '#1e40af',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '18px',
  fontWeight: '700',
  padding: '18px 36px',
  textDecoration: 'none',
  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  border: 'none',
  transition: 'all 0.3s ease',
};

const buttonText = {
  color: '#1e40af',
};

const buttonArrow = {
  color: '#7c3aed',
  fontSize: '20px',
  fontWeight: '900',
};

const ctaFootnote = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '14px',
  margin: '0',
};



const opportunitySection = {
  padding: '32px 24px',
  backgroundColor: '#111827',
  margin: '24px 0',
  borderRadius: '12px',
  border: '1px solid #374151',
};

const sectionTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const opportunitySubtitle = {
  color: '#94a3b8',
  fontSize: '14px',
  margin: '0 0 20px 0',
};

const opportunityCard = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const opportunityTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
  lineHeight: '1.4',
};

const opportunityDescription = {
  color: '#94a3b8',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
}; 