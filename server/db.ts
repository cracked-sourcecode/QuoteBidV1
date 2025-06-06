import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, SQL } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";
import { users, publications } from "@shared/schema";
import { samplePublications } from './data/publications';

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Database seeding function
async function seedDatabase() {
  if (!db || !pool) {
    throw new Error("Database not initialized");
  }
  
  try {
    // First, ensure media_coverage table exists
    try {
      console.log('🛠️ Ensuring media_coverage table exists...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "media_coverage" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" integer NOT NULL,
          "title" text NOT NULL,
          "publication" text,
          "url" text NOT NULL,
          "article_date" timestamp,
          "source" text DEFAULT 'manual',
          "pitch_id" integer,
          "placement_id" integer,
          "is_verified" boolean DEFAULT false,
          "screenshot" text,
          "metrics" jsonb DEFAULT '{}'::jsonb,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      
      // Add foreign key constraints if they don't exist
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'media_coverage_user_id_users_id_fk') THEN
            ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_user_id_users_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'media_coverage_pitch_id_pitches_id_fk') THEN
            ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_pitch_id_pitches_id_fk" 
            FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE SET NULL;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'media_coverage_placement_id_placements_id_fk') THEN
            ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_placement_id_placements_id_fk" 
            FOREIGN KEY ("placement_id") REFERENCES "placements"("id") ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      
      console.log('✅ media_coverage table verified/created successfully');
    } catch (tableError) {
      console.error('❌ Error creating media_coverage table:', tableError);
    }
    
    // Check if publications table is empty
    const existingPublications = await db.select().from(publications);
    
    if (existingPublications.length === 0) {
      console.log('🌱 Seeding database with sample publications...');
      
      // Insert sample publications
      for (const pub of samplePublications) {
        if (pub.name && pub.logo) {
          await db.insert(publications).values({
            name: pub.name,
            logo: pub.logo,
            website: pub.website || null,
            description: pub.description || null,
            category: pub.category || null,
            tier: pub.tier || null
          });
        }
      }
      
      console.log(`✅ Successfully seeded ${samplePublications.length} publications`);
    } else {
      console.log(`📊 Database already contains ${existingPublications.length} publications`);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

export function initializeDatabase() {
  // Debug logging
  console.log('=== Database Initialization Debug ===');
  console.log('Current working directory:', process.cwd());
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('All environment variables:', Object.keys(process.env));
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
  console.log('First 10 chars of DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 10));
  console.log('Last 10 chars of DATABASE_URL:', process.env.DATABASE_URL?.slice(-10));
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

  // Seed the database
  seedDatabase().catch(console.error);

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
      const database = getDb();
      const result = await database.select({
        id: users.id,
        profileCompleted: users.profileCompleted
      })
        .from(users)
        .where(eq(users.email, email));
      if (result.length === 0) {
        throw new Error('User not found');
      }
      const user = result[0];
      if (user.profileCompleted) {
        return 'ready';
      }
      // Default to payment stage if not completed
      return 'payment';
    } catch (error) {
      console.error('Error fetching user signup stage:', error);
      throw error;
    }
  },
  
  // Advance user signup stage
  async advanceStage(email: string, action: string): Promise<string> {
    try {
      const database = getDb();
      const currentStage = await this.userStage(email);
      let nextStage;
      if (action === 'payment' && currentStage === 'payment') {
        nextStage = 'profile';
      } else if (action === 'profile' && currentStage === 'profile') {
        nextStage = 'ready';
      } else {
        return currentStage;
      }
      if (nextStage === 'profile') {
        await database.update(users)
          .set({ subscription_status: 'active' })
          .where(eq(users.email, email));
      } else if (nextStage === 'ready') {
        await database.update(users)
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