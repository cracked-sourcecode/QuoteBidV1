import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking service startup requirements...');

// Check environment variables
console.log('📋 Environment check:');
console.log('  DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);

// Test database connection
async function testDatabase() {
  try {
    console.log('🗄️ Testing database connection...');
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error);
    return false;
  }
}

// Test pricing worker initialization
async function testWorker() {
  try {
    console.log('⚙️ Testing pricing worker initialization...');
    const { startWorker } = await import('./apps/worker/pricingWorker');
    console.log('✅ Pricing worker module loaded successfully');
    return true;
  } catch (error) {
    console.log('❌ Pricing worker failed to load:', error);
    return false;
  }
}

// Test WebSocket server
async function testWebSocket() {
  try {
    console.log('🔌 Testing WebSocket server...');
    await import('./apps/wsServer');
    console.log('✅ WebSocket server module loaded successfully');
    return true;
  } catch (error) {
    console.log('❌ WebSocket server failed to load:', error);
    return false;
  }
}

async function runChecks() {
  const results = await Promise.all([
    testDatabase(),
    testWorker(),
    testWebSocket()
  ]);
  
  const allPassed = results.every(r => r);
  
  if (allPassed) {
    console.log('🎉 All service checks passed!');
  } else {
    console.log('❌ Some service checks failed');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runChecks(); 