import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { variable_registry } from "../shared/schema.js";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function addFloorCeilVariables() {
  console.log("🎯 Adding floor and ceil variables to variable_registry...");
  
  try {
    const variablesToAdd = [
      {
        name: 'floor',
        weight: '50',
        description: 'Minimum price floor (dollars)'
      },
      {
        name: 'ceil', 
        weight: '500',
        description: 'Maximum price ceiling (dollars)'
      }
    ];
    
    for (const variable of variablesToAdd) {
      // Check if variable already exists
      const existing = await db
        .select()
        .from(variable_registry)
        .where(eq(variable_registry.var_name, variable.name))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`✅ ${variable.name} variable already exists`);
        console.log(`   Current value: ${existing[0].weight}`);
        continue;
      }
      
      // Insert the variable
      const result = await db
        .insert(variable_registry)
        .values({
          var_name: variable.name,
          weight: variable.weight,
          nonlinear_fn: 'none',
          updated_at: new Date()
        })
        .returning();
      
      console.log(`✅ Added ${variable.name} variable:`);
      console.log(`   Name: ${result[0].var_name}`);
      console.log(`   Weight: ${result[0].weight} (${variable.description})`);
      console.log(`   Function: ${result[0].nonlinear_fn}`);
      console.log(`   Created: ${result[0].updated_at}`);
    }
    
  } catch (error) {
    console.error("❌ Error adding floor/ceil variables:", error);
    throw error;
  }
}

// Run the script
addFloorCeilVariables()
  .then(() => {
    console.log("🎉 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 