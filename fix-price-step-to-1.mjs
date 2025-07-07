// Force set priceStep to 1 and trigger reload
async function fixPriceStepTo1() {
  console.log('🔧 Setting priceStep to 1...');
  
  try {
    // Get admin auth token from your current session (you'll need to replace this)
    // For now, just show the curl commands you can run
    
    console.log('📋 Run these commands to fix the priceStep:');
    console.log('');
    console.log('1. Set priceStep to 1:');
    console.log('curl -X PATCH http://localhost:5050/api/admin/config/priceStep \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\');
    console.log('  -d \'{"value": 1}\'');
    console.log('');
    console.log('2. Force pricing engine reload:');
    console.log('curl -X POST http://localhost:5050/api/admin/reload-pricing-engine \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"');
    console.log('');
    console.log('OR just:');
    console.log('- Go to admin panel → Pricing');
    console.log('- Change "Dollar amount per price step" to 1');
    console.log('- Click save');
    console.log('- Wait 30 seconds for the pricing worker to sync');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPriceStepTo1(); 