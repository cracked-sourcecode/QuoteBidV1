import { getDb } from './server/db/index.js';
import { pricing_config } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixPriceStep() {
  console.log('🔍 Checking current priceStep configuration...');
  
  try {
    // Get current priceStep value
    const currentConfig = await getDb()
      .select()
      .from(pricing_config)
      .where(eq(pricing_config.key, 'priceStep'));
    
    console.log('📊 Current priceStep config:', currentConfig);
    
    if (currentConfig.length === 0) {
      console.log('⚠️ No priceStep found in database, creating with value 1');
      
      await getDb()
        .insert(pricing_config)
        .values({
          key: 'priceStep',
          value: 1,
          updated_at: new Date()
        });
        
      console.log('✅ Created priceStep = 1');
    } else {
      const currentValue = currentConfig[0].value;
      console.log(`📈 Current priceStep value: ${currentValue}`);
      
      if (currentValue !== 1) {
        console.log(`🔧 Updating priceStep from ${currentValue} to 1...`);
        
        await getDb()
          .update(pricing_config)
          .set({
            value: 1,
            updated_at: new Date()
          })
          .where(eq(pricing_config.key, 'priceStep'));
          
        console.log('✅ Updated priceStep to 1');
        console.log('💡 This will fix the $2 movements to $1 movements');
      } else {
        console.log('✅ priceStep is already set to 1');
      }
    }
    
    // Show final value
    const finalConfig = await getDb()
      .select()
      .from(pricing_config)
      .where(eq(pricing_config.key, 'priceStep'));
      
    console.log('🎯 Final priceStep configuration:', finalConfig[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPriceStep().catch(console.error); 