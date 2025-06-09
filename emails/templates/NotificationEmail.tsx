import React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Img } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import Button from '../components/Button';

interface NotificationEmailProps {
  type: 'system' | 'opportunity' | 'pitch_status' | 'payment' | 'media_coverage';
  title: string;
  message: string;
  userName: string;
  linkUrl?: string;
  linkText?: string;
  icon?: string;
  iconColor?: string;
}

const NotificationEmail: React.FC<NotificationEmailProps> = ({
  type,
  title,
  message,
  userName,
  linkUrl,
  linkText = 'View Details',
  icon,
  iconColor = 'blue'
}) => {
  // Get notification-specific styling and content
  const getNotificationStyle = () => {
    switch (type) {
      case 'opportunity':
        return {
          headerColor: '#3b82f6', // Blue
          emoji: '🚀',
          subject: 'New Opportunity Available'
        };
      case 'pitch_status':
        return {
          headerColor: getStatusColor(),
          emoji: getStatusEmoji(),
          subject: 'Pitch Status Update'
        };
      case 'payment':
        return {
          headerColor: '#059669', // Green
          emoji: '💰',
          subject: 'Payment Confirmation'
        };
      case 'media_coverage':
        return {
          headerColor: '#7c3aed', // Purple
          emoji: '📰',
          subject: 'New Media Coverage'
        };
      case 'system':
      default:
        return {
          headerColor: '#6b7280', // Gray
          emoji: '📢',
          subject: 'QuoteBid Notification'
        };
    }
  };

  const getStatusColor = () => {
    if (title.includes('Accepted') || title.includes('Successful')) return '#059669'; // Green
    if (title.includes('Rejected') || title.includes('Not Selected')) return '#dc2626'; // Red
    if (title.includes('Review') || title.includes('Pending')) return '#d97706'; // Orange
    return '#3b82f6'; // Blue default
  };

  const getStatusEmoji = () => {
    if (title.includes('Accepted') || title.includes('Successful')) return '🎉';
    if (title.includes('Rejected') || title.includes('Not Selected')) return '❌';
    if (title.includes('Review') || title.includes('Pending')) return '👀';
    return '📄';
  };

  const style = getNotificationStyle();

  return (
    <EmailLayout previewText={`${style.emoji} ${title}`}>
      {/* Header with styled title */}
      <Section style={{
        backgroundColor: style.headerColor,
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <Text style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#ffffff',
          margin: '0'
        }}>
          {style.emoji} {title}
        </Text>
      </Section>

      {/* Greeting */}
      <Text style={{ 
        fontSize: '16px', 
        lineHeight: '24px', 
        color: '#374151',
        marginBottom: '20px'
      }}>
        Hi {userName},
      </Text>

      {/* Main Content */}
      <Section style={{
        backgroundColor: '#f9fafb',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <Text style={{
          fontSize: '15px',
          lineHeight: '22px',
          color: '#4b5563',
          margin: '0'
        }}>
          {message}
        </Text>
      </Section>

      {/* Action Button */}
      {linkUrl && (
        <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Button 
            href={linkUrl}
            variant="primary"
            size="md"
          >
            {linkText}
          </Button>
        </Section>
      )}

      {/* Footer Message */}
      <Text style={{
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        marginTop: '32px'
      }}>
        Stay connected and never miss an opportunity with QuoteBid!
      </Text>
    </EmailLayout>
  );
};

export default NotificationEmail; 