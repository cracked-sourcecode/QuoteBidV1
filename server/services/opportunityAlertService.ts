import { getDb } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendNewOpportunityAlertEmail } from '../lib/email-production';

interface OpportunityData {
  id: number;
  title: string;
  industry: string;
  requestType?: string;
  publication?: {
    name: string;
  };
}

export async function fireOpportunityAlert(opportunity: OpportunityData) {
  console.log(`🚀 Firing opportunity alert for ${opportunity.id} - industry: ${opportunity.industry}`);
  
  // 1. Grab matching users
  const matchingUsers = await getDb()
    .select({ 
      id: users.id, 
      email: users.email, 
      fullName: users.fullName,
      username: users.username 
    })
    .from(users)
    .where(eq(users.industry, opportunity.industry));

  if (!matchingUsers.length) {
    console.log(`Opportunity ${opportunity.id}: no users with industry "${opportunity.industry}"`);
    return;
  }

  console.log(`Opportunity ${opportunity.id}: found ${matchingUsers.length} users with industry "${opportunity.industry}"`);

  // 2. Send emails in parallel using your working email service
  await Promise.all(
    matchingUsers.map(async (user) => {
      try {
        const result = await sendNewOpportunityAlertEmail({
          userFirstName: user.fullName?.split(' ')[0] || user.username || 'Expert',
          email: user.email,
          publicationType: opportunity.publication?.name || 'Top Publication',
          title: opportunity.title,
          requestType: opportunity.requestType || 'Expert Request',
          bidDeadline: '7 days left',
          opportunityId: opportunity.id
        });

        if (result.success) {
          console.log(`✅ Sent alert to ${user.email}`);
        } else {
          console.error(`❌ Failed to send to ${user.email}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending to ${user.email}:`, error);
      }
    })
  );

  console.log(`🎉 Opportunity ${opportunity.id}: sent alert to ${matchingUsers.length} user(s)`);
} 