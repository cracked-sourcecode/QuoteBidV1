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

  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Opportunity</title>
      </Head>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>
              <span style={quotePart}>Quote</span><span style={bidPart}>Bid</span>
            </Text>
            <Text style={headerSubtitle}>🚨 New Opportunity</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            
            <Text style={greeting}>Hi {userFirstName},</Text>

            <Text style={bodyText}>
              New {opportunity.industry} opportunity:
            </Text>

            {/* Opportunity */}
            <div style={opportunityCard}>
              <Text style={publicationName}>{opportunity.publicationName}</Text>
              <Heading style={opportunityTitle}>{opportunity.title}</Heading>
              <Text style={priceText}>{opportunity.currentPrice} • ⏰ {opportunity.deadline}</Text>
              <a href={`${frontendUrl}/opportunities/${opportunity.id}`} style={pitchButton}>
                Pitch Now
              </a>
            </div>

          </Section>

          <EmailFooter frontendUrl={frontendUrl} />

        </Container>
      </Body>
    </Html>
  );
}

// Ultra-Simple Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: '20px',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#1e293b',
  padding: '20px',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  color: '#ffffff',
};

const quotePart = {
  color: '#ffffff',
};

const bidPart = {
  color: '#3b82f6',
};

const headerSubtitle = {
  color: '#fbbf24',
  fontSize: '14px',
  margin: '0',
};

const content = {
  padding: '30px',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  margin: '0 0 12px 0',
};

const bodyText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0 0 20px 0',
};

const opportunityCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const publicationName = {
  color: '#1e293b',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const opportunityTitle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const priceText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 16px 0',
};

const pitchButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
}; 