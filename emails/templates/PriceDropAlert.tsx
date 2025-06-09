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

interface PriceDropAlertProps {
  opportunityTitle: string;
  oldPrice: number;
  newPrice: number;
  outlet: string;
  deadline: string;
  frontendUrl: string;
  opportunityId: string;
}

export default function PriceDropAlert({
  opportunityTitle,
  oldPrice,
  newPrice,
  outlet,
  deadline,
  frontendUrl,
  opportunityId,
}: PriceDropAlertProps) {
  const percentageDrop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  
  return (
    <EmailLayout previewText={`Price dropped ${percentageDrop}% on ${opportunityTitle}`}>
      {/* Alert Badge */}
      <Section style={alertSection}>
        <Row>
          <Column style={alertBadge}>
            <Text style={alertText}>🔥 PRICE DROP ALERT</Text>
          </Column>
        </Row>
      </Section>

      {/* Hero */}
      <Section style={hero}>
        <Heading style={heroHeading}>
          Price Just Dropped!
        </Heading>
        <Text style={heroSubtext}>
          Great news! The price has dropped on an opportunity you're interested in.
        </Text>
      </Section>

      {/* Opportunity Card */}
      <Section style={opportunityCard}>
        <Text style={outletName}>{outlet}</Text>
        <Heading style={opportunityTitle_style}>
          {opportunityTitle}
        </Heading>
        
        {/* Price Section */}
        <Section style={priceSection}>
          <Row>
            <Column style={priceColumn}>
              <Text style={priceLabel}>Previous Price</Text>
              <Text style={oldPriceText}>${oldPrice}</Text>
            </Column>
            <Column style={arrowColumn}>
              <Text style={arrow}>→</Text>
            </Column>
            <Column style={priceColumn}>
              <Text style={priceLabel}>New Price</Text>
              <Text style={newPriceText}>${newPrice}</Text>
            </Column>
          </Row>
          
          <Section style={savingsSection}>
            <Text style={savingsText}>
              You save ${oldPrice - newPrice} ({percentageDrop}% off)
            </Text>
          </Section>
        </Section>

        {/* Deadline */}
        <Section style={deadlineSection}>
          <Text style={deadlineLabel}>⏰ Deadline</Text>
          <Text style={deadlineText}>{deadline}</Text>
        </Section>
      </Section>

      {/* CTA */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          This could be your perfect opportunity to submit a pitch at a great price!
        </Text>
        <Button href={`${frontendUrl}/opportunities/${opportunityId}`} size="lg">
          View Opportunity & Pitch →
        </Button>
      </Section>

      <Hr style={hr} />

      {/* Tips */}
      <Section style={tipsSection}>
        <Heading style={tipsHeading}>💡 Quick Tips</Heading>
        <Text style={tipText}>
          • <strong>Act Fast:</strong> Prices can change quickly based on demand
        </Text>
        <Text style={tipText}>
          • <strong>Craft Your Pitch:</strong> Personalize your message for the best results
        </Text>
        <Text style={tipText}>
          • <strong>Check Requirements:</strong> Make sure you meet all the opportunity criteria
        </Text>
      </Section>

      {/* Footer Note */}
      <Section style={footerNote}>
        <Text style={footerText}>
          You're receiving this because you've shown interest in this opportunity. 
          Want to adjust your notifications?{' '}
          <a href={`${frontendUrl}/settings/notifications`} style={link}>
            Update preferences
          </a>
        </Text>
      </Section>
    </EmailLayout>
  );
}

// Styles
const alertSection = {
  padding: '0 0 24px 0',
  textAlign: 'center' as const,
};

const alertBadge = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '20px',
  padding: '8px 16px',
  display: 'inline-block',
};

const alertText = {
  color: '#92400e',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const hero = {
  padding: '0 0 32px 0',
  textAlign: 'center' as const,
};

const heroHeading = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  margin: '0 0 12px 0',
};

const heroSubtext = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const opportunityCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 0 32px 0',
};

const outletName = {
  color: '#3b82f6',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const opportunityTitle_style = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '0 0 24px 0',
};

const priceSection = {
  padding: '20px 0',
  textAlign: 'center' as const,
};

const priceColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle',
};

const arrowColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle',
  width: '40px',
};

const arrow = {
  color: '#6b7280',
  fontSize: '24px',
  margin: '0',
};

const priceLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const oldPriceText = {
  color: '#9ca3af',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0',
  textDecoration: 'line-through',
};

const newPriceText = {
  color: '#059669',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
};

const savingsSection = {
  padding: '16px 0 0 0',
  textAlign: 'center' as const,
};

const savingsText = {
  backgroundColor: '#d1fae5',
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600',
  padding: '8px 16px',
  borderRadius: '20px',
  margin: '0',
  display: 'inline-block',
};

const deadlineSection = {
  padding: '20px 0 0 0',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
  marginTop: '20px',
};

const deadlineLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const deadlineText = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
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

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const tipsSection = {
  padding: '32px 0',
};

const tipsHeading = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const tipText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
};

const footerNote = {
  padding: '24px 0 0 0',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
}; 