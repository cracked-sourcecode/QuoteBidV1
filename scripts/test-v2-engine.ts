import { updatePrices } from "../server/jobs/updatePrices";
import * as dotenv from 'dotenv';

dotenv.config();

async function testV2Engine() {
  console.log('🧪 Testing V2 Pricing Engine...');
  
  try {
    await updatePrices();
    console.log('✅ V2 engine test completed successfully');
  } catch (error) {
    console.error('❌ V2 engine test failed:', error);
  }
}

testV2Engine(); 