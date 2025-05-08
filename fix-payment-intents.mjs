import pkg from '@neondatabase/serverless';
const { Pool, neonConfig } = pkg;
import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import * as schema from './shared/schema.js';
const { placements, pitches } = schema;

neonConfig.webSocketConstructor = ws;

// Initialize database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function fixPlacementPaymentIntents() {
  try {
    console.log('Starting to fix placement payment intent IDs...');
    
    // Get all placements
    const allPlacements = await db.select().from(placements);
    console.log(`Found ${allPlacements.length} placements total.`);
    
    // Get all placements without payment intent IDs
    const placementsWithoutPI = allPlacements.filter(p => !p.paymentIntentId);
    console.log(`Found ${placementsWithoutPI.length} placements missing payment intent IDs.`);
    
    // For each placement without a payment intent ID, get the associated pitch
    let fixed = 0;
    for (const placement of placementsWithoutPI) {
      const [pitch] = await db.select().from(pitches).where(eq(pitches.id, placement.pitchId));
      
      if (pitch && pitch.paymentIntentId) {
        // Update the placement with the pitch's payment intent ID
        await db.update(placements)
          .set({ paymentIntentId: pitch.paymentIntentId })
          .where(eq(placements.id, placement.id));
        
        console.log(`Updated placement ${placement.id} with payment intent ID ${pitch.paymentIntentId} from pitch ${pitch.id}`);
        fixed++;
      } else {
        console.log(`Placement ${placement.id} - associated pitch ${placement.pitchId} has no payment intent ID.`);
      }
    }
    
    console.log(`Fixed ${fixed} placements.`);
    console.log('Completed fixing placement payment intent IDs.');
  } catch (error) {
    console.error('Error fixing payment intent IDs:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

fixPlacementPaymentIntents();
