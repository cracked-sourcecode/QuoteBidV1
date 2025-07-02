#!/usr/bin/env node

import dotenv from 'dotenv';
import { notificationService } from './server/services/notification-service.ts';

// Load environment variables
dotenv.config();

async function testNotificationEmails() {
  console.log('🧪 Testing notification email system...\n');

  try {
    // Test critical notification (should bypass preferences)
    console.log('1. Testing CRITICAL pitch status notification...');
    await notificationService.createNotification({
      userId: 1, // Assuming user ID 1 exists (you may need to adjust)
      type: 'pitch_status',
      title: '🎉 Test Pitch Status Update',
      message: 'This is a test pitch status notification that should bypass user preferences.',
      linkUrl: '/my-pitches',
      icon: 'check-circle',
      iconColor: 'green',
    });
    console.log('✅ Critical notification sent\n');

    // Test regular notification (checks preferences)
    console.log('2. Testing regular opportunity notification...');
    await notificationService.createNotification({
      userId: 1,
      type: 'opportunity',
      title: '🚀 Test Opportunity Notification',
      message: 'This is a test opportunity notification that checks user preferences.',
      linkUrl: '/opportunities/123',
      icon: 'tag',
      iconColor: 'blue',
    });
    console.log('✅ Regular notification sent\n');

    console.log('🎉 Notification email test completed!');
    console.log('📧 Check ben@rubiconprgroup.com for emails');
    console.log('📊 Check server logs for email preference details');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotificationEmails(); 