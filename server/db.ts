import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, SQL } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";
import { users } from "@shared/schema";

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDatabase() {
  // Debug logging
  console.log('=== Database Initialization Debug ===');
  console.log('Current working directory:', process.cwd());
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('All environment variables:', Object.keys(process.env));
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
  console.log('First 10 chars of DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 10));
  console.log('Last 10 chars of DATABASE_URL:', process.env.DATABASE_URL?.substring(-10));
  console.log('===================================');

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Create a connection pool
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Create a drizzle client from pool
  db = drizzle(pool, { schema });

  return { pool, db };
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initializeDatabase() first.");
  }
  return pool;
}

// Create a separate signup wizard utility
export const signupWizardUtils = {
  // Get user signup stage by email
  async userStage(email: string): Promise<string> {
    try {
      // Until the signup_stage field is properly migrated, we'll return a default value
      // based on the user's profile completion
      const result = await db.select({
        id: users.id,
        profileCompleted: users.profileCompleted,
        agreementPdfUrl: users.agreementPdfUrl
      })
        .from(users)
        .where(eq(users.email, email));
      
      if (result.length === 0) {
        throw new Error('User not found');
      }
      
      // Simulate signup stage until the migration is complete
      const user = result[0];
      
      // If profile is completed, they're ready
      if (user.profileCompleted) {
        return 'ready';
      }
      
      // If they have an agreement PDF, they're at payment stage
      if (user.agreementPdfUrl !== null && user.agreementPdfUrl !== undefined) {
        return 'payment';
      }
      
      // Otherwise they're at agreement stage
      return 'agreement';
    } catch (error) {
      console.error('Error fetching user signup stage:', error);
      throw error;
    }
  },
  
  // Advance user signup stage
  async advanceStage(email: string, action: string): Promise<string> {
    try {
      // Get current stage
      const currentStage = await this.userStage(email);
      
      // Determine next stage based on current stage and action
      let nextStage;
      if (action === 'agreement' && currentStage === 'agreement') {
        nextStage = 'payment';
      } else if (action === 'payment' && currentStage === 'payment') {
        nextStage = 'profile';
      } else if (action === 'profile' && currentStage === 'profile') {
        nextStage = 'ready';
      } else {
        // Invalid transition or already at final stage
        return currentStage;
      }
      
      // Update relevant user fields based on the stage
      if (nextStage === 'payment') {
        // Agreement completed - nothing to update since agreementPdfUrl is already set
      } else if (nextStage === 'profile') {
        // Payment completed - update subscription status
        await db.update(users)
          .set({ subscription_status: 'active' })
          .where(eq(users.email, email));
      } else if (nextStage === 'ready') {
        // Profile completed - update profile completed flag
        await db.update(users)
          .set({ profileCompleted: true })
          .where(eq(users.email, email));
      }
      
      return nextStage;
    } catch (error) {
      console.error('Error advancing user signup stage:', error);
      throw error;
    }
  }
};