import { getDb, initializeDatabase } from '../db';
import { users } from '../../shared/schema';
import { like, eq } from 'drizzle-orm';

async function fixAvatarUrls() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    console.log('Fixing avatar URLs in the database...');
    
    // Find all users with avatar URLs that contain the full URL
    const usersWithFullUrls = await getDb()
      .select()
      .from(users)
      .where(like(users.avatar, '%http%'));
    
    console.log(`Found ${usersWithFullUrls.length} users with full avatar URLs`);
    
    // Fix each user's avatar URL
    for (const user of usersWithFullUrls) {
      if (user.avatar) {
        // Extract the relative path from the full URL
        // Example: http://localhost:5050/uploads/avatars/avatar-123.png -> /uploads/avatars/avatar-123.png
        const match = user.avatar.match(/\/uploads\/avatars\/[^\/]+$/);
        
        if (match) {
          const relativePath = match[0];
          console.log(`Fixing user ${user.id}: ${user.avatar} -> ${relativePath}`);
          
          // Update the user's avatar with the relative path
          await getDb()
            .update(users)
            .set({ avatar: relativePath })
            .where(eq(users.id, user.id));
        } else {
          console.log(`Could not extract relative path for user ${user.id}: ${user.avatar}`);
        }
      }
    }
    
    console.log('Avatar URLs fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing avatar URLs:', error);
    process.exit(1);
  }
}

// Run the script
fixAvatarUrls(); 