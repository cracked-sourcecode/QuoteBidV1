import React from 'react';
import {
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
} from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import Button from '../components/Button';

interface WelcomeEmailProps {
  userFirstName: string;
  username: string;
  frontendUrl: string;
}

export default function WelcomeEmail({
  userFirstName,
  username,
  frontendUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText={`Welcome to QuoteBid, ${userFirstName}! Start bidding on PR opportunities.`}>
      {/* Hero Section */}
      <Section style={hero}>
        <Heading style={heroHeading}>
          Welcome to QuoteBid! 🎉
        </Heading>
        <Text style={heroText}>
          Hi {userFirstName}, you're now part of the future of PR pitching. 
          Get ready to bid on opportunities with our AI-powered pricing engine.
        </Text>
      </Section>

      {/* How It Works */}
      <Section style={section}>
        <Heading style={sectionHeading}>
          How QuoteBid Works
        </Heading>
        <Text style={description}>
          Our platform revolutionizes PR pitching with dynamic pricing and intelligent matching:
        </Text>

        <Row style={stepRow}>
          <Column style={stepNumber}>
            <Text style={numberBadge}>1</Text>
          </Column>
          <Column style={stepContent}>
            <Text style={stepTitle}>Browse Live Opportunities</Text>
            <Text style={stepDescription}>
              Discover curated PR opportunities from top-tier publications with real-time pricing.
            </Text>
          </Column>
        </Row>

        <Row style={stepRow}>
          <Column style={stepNumber}>
            <Text style={numberBadge}>2</Text>
          </Column>
          <Column style={stepContent}>
            <Text style={stepTitle}>Smart AI Pricing</Text>
            <Text style={stepDescription}>
              Our GPT-4o engine analyzes demand and adjusts prices every minute for optimal bidding.
            </Text>
          </Column>
        </Row>

        <Row style={stepRow}>
          <Column style={stepNumber}>
            <Text style={numberBadge}>3</Text>
          </Column>
          <Column style={stepContent}>
            <Text style={stepTitle}>Place Your Pitch</Text>
            <Text style={stepDescription}>
              Submit compelling pitches when prices drop and increase your chances of placement.
            </Text>
          </Column>
        </Row>

        <Row style={stepRow}>
          <Column style={stepNumber}>
            <Text style={numberBadge}>4</Text>
          </Column>
          <Column style={stepContent}>
            <Text style={stepTitle}>Get Featured</Text>
            <Text style={stepDescription}>
              Win placements and get your stories published by leading media outlets.
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={hr} />

      {/* Pro Tips */}
      <Section style={section}>
        <Heading style={sectionHeading}>
          💡 Pro Tips for Success
        </Heading>
        <Text style={tipItem}>
          <strong>Watch for Price Drops:</strong> Our AI reduces prices when demand is low - perfect timing for your pitch!
        </Text>
        <Text style={tipItem}>
          <strong>Craft Compelling Pitches:</strong> Journalists love unique angles and timely hooks.
        </Text>
        <Text style={tipItem}>
          <strong>Act Fast:</strong> Popular opportunities fill up quickly when prices are attractive.
        </Text>
        <Text style={tipItem}>
          <strong>Build Relationships:</strong> Successful placements lead to ongoing opportunities.
        </Text>
      </Section>

      {/* CTA Section */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          Ready to start pitching? Browse live opportunities now:
        </Text>
        <Button href={`${frontendUrl}/opportunities`} size="lg">
          Explore Opportunities →
        </Button>
      </Section>

      <Hr style={hr} />

      {/* Support */}
      <Section style={supportSection}>
        <Text style={supportText}>
          Need help getting started? Our team is here to support you every step of the way.
        </Text>
        <Text style={supportText}>
          Reply to this email or visit our{' '}
          <a href={`${frontendUrl}/help`} style={link}>
            Help Center
          </a>{' '}
          for guides and best practices.
        </Text>
      </Section>
    </EmailLayout>
  );
}

// Modern styling
const hero = {
  padding: '0 0 32px 0',
  textAlign: 'center' as const,
};

const heroHeading = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: '700',
  lineHeight: '40px',
  margin: '0 0 16px 0',
};

const heroText = {
  color: '#6b7280',
  fontSize: '18px',
  lineHeight: '28px',
  margin: '0',
};

const section = {
  padding: '32px 0',
};

const sectionHeading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 16px 0',
};

const description = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px 0',
};

const stepRow = {
  margin: '0 0 24px 0',
};

const stepNumber = {
  width: '48px',
  verticalAlign: 'top',
};

const numberBadge = {
  backgroundColor: '#3b82f6',
  borderRadius: '50%',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  height: '32px',
  lineHeight: '32px',
  margin: '0',
  textAlign: 'center' as const,
  width: '32px',
};

const stepContent = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const stepTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 4px 0',
};

const stepDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const tipItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px 0',
};

const ctaSection = {
  padding: '32px 0',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '28px',
  margin: '0 0 24px 0',
};

const supportSection = {
  padding: '24px 0 0 0',
  textAlign: 'center' as const,
};

const supportText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
}; 