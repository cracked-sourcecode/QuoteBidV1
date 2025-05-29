import { getDb, initializeDatabase } from '../db';
import { users, pitches, opportunities } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function checkUser151() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    console.log('Checking for user 151...');
    
    // Check if user 151 exists
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, 151));
    
    if (user) {
      console.log('User 151 found:', {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar
      });
    } else {
      console.log('User 151 NOT FOUND!');
    }
    
    // Check pitches from user 151
    const userPitches = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.userId, 151));
    
    console.log(`\nFound ${userPitches.length} pitches from user 151`);
    
    // Check opportunity 9
    const [opportunity] = await getDb()
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, 9));
    
    if (opportunity) {
      console.log('\nOpportunity 9 found:', {
        id: opportunity.id,
        title: opportunity.title,
        publicationId: opportunity.publicationId
      });
    } else {
      console.log('\nOpportunity 9 NOT FOUND!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUser151(); 