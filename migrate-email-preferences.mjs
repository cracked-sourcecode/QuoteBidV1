#!/usr/bin/env node

import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Load environment variables
dotenv.config();

console.log('🔄 Starting Email Preferences Migration');
console.log('📧 Converting old format → new simplified format\n');

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString });

// Mapping from old format to new format
const PREFERENCE_MAPPING = {
  // OLD FORMAT → NEW FORMAT
  'priceAlerts': 'alerts',
  'opportunityNotifications': 'alerts',
  'pitchStatusUpdates': 'notifications',
  'mediaCoverageUpdates': 'notifications',
  'placementSuccess': 'notifications',
  'paymentConfirmations': 'billing'
};

function convertPreferences(oldPrefs) {
  const newPrefs = {
    alerts: true,
    notifications: true,
    billing: true
  };

  // Convert old format to new format
  for (const [oldKey, newKey] of Object.entries(PREFERENCE_MAPPING)) {
    if (oldPrefs[oldKey] !== undefined) {
      // If any old preference in a category is false, set the new category to false
      if (oldPrefs[oldKey] === false) {
        newPrefs[newKey] = false;
      }
    }
  }

  return newPrefs;
}

async function migrateEmailPreferences() {
  try {
    console.log('📥 Fetching all users with email preferences...');
    
    // Get all users with email preferences using raw SQL
    const result = await pool.query(`
      SELECT id, email, email_preferences 
      FROM users 
      WHERE email_preferences IS NOT NULL
    `);
    
    const allUsers = result.rows;
    let migratedCount = 0;
    let alreadyNewFormat = 0;
    let noPreferences = 0;

    console.log(`📊 Found ${allUsers.length} users with email preferences\n`);

    for (const user of allUsers) {
      if (!user.email_preferences) {
        noPreferences++;
        console.log(`⚪ User ${user.email}: No preferences set (will use defaults)`);
        continue;
      }

      const currentPrefs = user.email_preferences;
      
      // Check if already in new format
      const hasNewFormat = 'alerts' in currentPrefs || 'notifications' in currentPrefs || 'billing' in currentPrefs;
      const hasOldFormat = 'priceAlerts' in currentPrefs || 'opportunityNotifications' in currentPrefs;

      if (hasNewFormat && !hasOldFormat) {
        alreadyNewFormat++;
        console.log(`✅ User ${user.email}: Already in new format`);
        continue;
      }

      if (hasOldFormat) {
        console.log(`🔄 User ${user.email}: Converting old format...`);
        console.log(`   OLD: ${JSON.stringify(currentPrefs)}`);
        
        const newPrefs = convertPreferences(currentPrefs);
        console.log(`   NEW: ${JSON.stringify(newPrefs)}`);

        // Update user preferences using raw SQL
        await pool.query(`
          UPDATE users 
          SET email_preferences = $1 
          WHERE id = $2
        `, [JSON.stringify(newPrefs), user.id]);

        migratedCount++;
        console.log(`✅ User ${user.email}: Migration completed\n`);
      } else {
        console.log(`⚠️  User ${user.email}: Unknown preference format - skipping`);
      }
    }

    console.log('\n🏁 ===== MIGRATION RESULTS =====');
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`👍 Already new format: ${alreadyNewFormat} users`);
    console.log(`⚪ No preferences: ${noPreferences} users`);
    console.log(`📊 Total processed: ${allUsers.length} users\n`);

    if (migratedCount > 0) {
      console.log('🎉 Email preferences migration completed successfully!');
      console.log('📧 All users now use the simplified format:');
      console.log('   • alerts: true/false');
      console.log('   • notifications: true/false');
      console.log('   • billing: true/false');
    } else {
      console.log('✨ No migration needed - all users already in correct format!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateEmailPreferences()
  .then(() => {
    console.log('\n🎯 Email preferences migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }); 