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

interface OpportunityAlertEmailProps {
  userFirstName: string;
  frontendUrl: string;
  opportunity: {
    id: number;
    title: string;
    description: string;
    publicationName: string;
    industry: string;
    deadline: string;
    currentPrice: string;
    trend: string;
  };
}

export default function OpportunityAlertEmail({
  userFirstName,
  frontendUrl,
  opportunity,
}: OpportunityAlertEmailProps) {
  
  // Get publication logo and styling
  const getPublicationStyling = (publicationName: string) => {
    const publications: { [key: string]: { logo: string; bgColor: string } } = {
      'Bloomberg': { logo: 'B', bgColor: '#1f2937' },
      'TechCrunch': { logo: 'T', bgColor: '#1e40af' },
      'Wall Street Journal': { logo: 'W', bgColor: '#059669' },
      'Reuters': { logo: 'R', bgColor: '#7c3aed' },
      'CoinDesk': { logo: 'C', bgColor: '#ea580c' },
      'STAT News': { logo: 'S', bgColor: '#dc2626' },
    };
    
    return publications[publicationName] || { logo: publicationName.charAt(0), bgColor: '#1f2937' };
  };

  const pubStyle = getPublicationStyling(opportunity.publicationName);

  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Opportunity Alert - QuoteBid</title>
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
            
            <Heading style={alertTitle}>
              New Opportunity Alert!
            </Heading>
          </Section>

          <Section style={content}>
            
            {/* Personal greeting */}
            <Section style={greetingSection}>
              <Text style={greeting}>
                Hi Expert,
              </Text>
              
              <Text style={alertText}>
                🎯 Perfect timing! A new opportunity matching your {opportunity.industry} expertise just became available.
              </Text>
            </Section>

            {/* Urgency Alert */}
            <Section style={urgencySection}>
              <Text style={urgencyText}>
                This request was posted just minutes ago and prices are already moving up.
              </Text>
              <Text style={urgencySubText}>
                Act fast — the best opportunities get competitive quickly.
              </Text>
            </Section>

            {/* Live Opportunity Card */}
            <Section style={opportunitySection}>
              <Heading style={sectionTitle}>📊 Live Opportunity in Your Industry</Heading>
              <Text style={opportunitySubtitle}>
                Here's the current opportunity matching your {opportunity.industry} expertise:
              </Text>
              
              <div style={opportunityCard}>
                {/* Card Header */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: pubStyle.bgColor, 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {pubStyle.logo}
                    </div>
                    <div>
                      <div style={{color: '#1f2937', fontSize: '18px', fontWeight: 'bold', margin: '0'}}>
                        {opportunity.publicationName}
                      </div>
                      <div style={{color: '#6b7280', fontSize: '14px', margin: '0'}}>Expert Request</div>
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
                    Tier 2
                  </div>
                </div>
                
                {/* Category */}
                <div style={{marginBottom: '12px'}}>
                  <span style={{
                    color: '#3b82f6',
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
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '20px',
                    fontSize: '14px',
                    border: '1px solid #bfdbfe'
                  }}>
                    {opportunity.industry}
                  </span>
                </div>
                
                {/* Price Section */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div>
                      <div style={{color: '#6b7280', fontSize: '12px', margin: '0 0 4px 0'}}>Current Price</div>
                      <div style={{color: '#1f2937', fontSize: '32px', fontWeight: 'bold', margin: '0'}}>
                        {opportunity.currentPrice}
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <span style={{color: '#16a34a', fontSize: '14px', fontWeight: '500'}}>📈 {opportunity.trend}</span>
                    </div>
                  </div>
                </div>
                
                {/* Pitch Now Button */}
                <div style={{marginBottom: '16px'}}>
                  <a href={`${frontendUrl}/opportunities/${opportunity.id}`} style={{
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
                    🎯 Pitch Now at {opportunity.currentPrice}
                  </a>
                </div>
                
                {/* Status */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280'}}>
                    <span>⏰ 2 days</span>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      borderRadius: '12px'
                    }}>
                      🔥 Hot
                    </span>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '12px'
                  }}>
                    View Details
                  </span>
                </div>
              </div>
            </Section>

            {/* Pro Tips Section */}
            <Section style={proTipsSection}>
              <Heading style={proTipsHeading}>
                💡 Pro Tips for This Opportunity
              </Heading>
              
              <div style={tipsGrid}>
                <Text style={tipItem}>
                  <strong>Act Fast:</strong> This {opportunity.industry} opportunity is getting attention — prices tend to climb as deadlines approach.
                </Text>
                
                <Text style={tipItem}>
                  <strong>Use Your Voice:</strong> Submit pitches faster and stand out with human delivery.
                </Text>
                
                <Text style={tipItem}>
                  <strong>Only Pay When It Works:</strong> You're only charged if your quote makes it into the final article.
                </Text>
              </div>
            </Section>

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Text style={ctaEyebrow}>READY TO PITCH?</Text>
              <Heading style={ctaHeading}>
                Secure Your Spot Now
              </Heading>
              <Text style={ctaSubtext}>
                This opportunity won't last long. Price is {opportunity.currentPrice} and climbing.
              </Text>
              
              <div style={ctaButtonContainer}>
                <a href={`${frontendUrl}/opportunities/${opportunity.id}`} style={ctaButton}>
                  <span style={buttonText}>View Full Opportunity</span>
                  <span style={buttonArrow}>→</span>
                </a>
              </div>
              
              <Text style={ctaFootnote}>
                Opportunities in {opportunity.industry} are trending up today
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

// ===== BEAUTIFUL LIGHT THEME STYLES =====

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  margin: 0,
  padding: '20px',
  minHeight: '100vh',
  backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
};

const container = {
  background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 25%, #f1f5f9 50%, #ffffff 100%)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '24px',
  margin: '0 auto',
  maxWidth: '680px',
  overflow: 'hidden',
  boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
  position: 'relative' as const,
};

const header = {
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 50%, rgba(226, 232, 240, 0.95) 100%)',
  padding: '60px 40px',
  textAlign: 'center' as const,
  position: 'relative' as const,
  overflow: 'hidden',
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
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
  background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)',
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
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  borderRadius: '12px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: '800',
  color: '#3b82f6',
  letterSpacing: '0.1em',
  backdropFilter: 'blur(10px)',
};

const alertTitle = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
  lineHeight: '1.2',
};

const content = {
  padding: '0',
};

const greetingSection = {
  padding: '50px 40px 30px 40px',
  background: 'rgba(0, 0, 0, 0.02)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
};

const greeting = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px 0',
};

const alertText = {
  color: '#374151',
  fontSize: '18px',
  lineHeight: '1.6',
  margin: '0',
  fontWeight: '500',
};

const urgencySection = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))',
  borderRadius: '16px',
  border: '1px solid rgba(99, 102, 241, 0.1)',
  margin: '0 40px 30px 40px',
};

const urgencyText = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
  fontWeight: '600',
};

const urgencySubText = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
};

const opportunitySection = {
  padding: '32px 40px',
  backgroundColor: '#ffffff',
  margin: '0 40px 40px 40px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const opportunitySubtitle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 20px 0',
};

const opportunityCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
};

const opportunityTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
  lineHeight: '1.4',
};

const opportunityDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
};

const proTipsSection = {
  padding: '40px',
  background: 'rgba(0, 0, 0, 0.02)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
};

const proTipsHeading = {
  color: '#1f2937',
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
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  padding: '16px 20px',
  background: 'rgba(255, 255, 255, 0.6)',
  borderRadius: '12px',
  border: '1px solid rgba(0, 0, 0, 0.08)',
};

const ctaSection = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
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