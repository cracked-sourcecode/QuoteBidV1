import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5050';

async function testAPIValidation() {
  console.log("🧪 TESTING API VALIDATION");
  console.log("=" .repeat(50));
  
  // Test data for different variable types
  const testCases = [
    // Dollar amounts (should work with values 1-10000)
    { name: 'floor', value: 75, expected: 'success', type: 'dollar' },
    { name: 'ceil', value: 750, expected: 'success', type: 'dollar' },
    { name: 'floor', value: 0, expected: 'fail', type: 'dollar' }, // Too low
    
    // Percentages (should work with values 0-1)
    { name: 'baselineDecay', value: 0.08, expected: 'success', type: 'percentage' },
    { name: 'baselineDecay', value: 1.5, expected: 'fail', type: 'percentage' }, // Too high
    
    // Regular weights (should work with values -10 to 10)
    { name: 'pitches', value: 1.5, expected: 'success', type: 'weight' },
    { name: 'clicks', value: 15, expected: 'fail', type: 'weight' }, // Too high
  ];
  
  for (const test of testCases) {
    console.log(`\n🔄 Testing ${test.name} = ${test.value} (${test.type})`);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/variable/${test.name}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real usage, you'd need admin auth headers
        },
        body: JSON.stringify({ weight: test.value })
      });
      
      const success = response.ok;
      const result = await response.json();
      
      if (test.expected === 'success' && success) {
        console.log(`✅ PASS: ${test.name} accepted ${test.value}`);
      } else if (test.expected === 'fail' && !success) {
        console.log(`✅ PASS: ${test.name} correctly rejected ${test.value}`);
      } else {
        console.log(`❌ FAIL: ${test.name} with ${test.value} - Expected ${test.expected}, got ${success ? 'success' : 'fail'}`);
        console.log(`   Response: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: Failed to test ${test.name}: ${error}`);
    }
  }
  
  console.log("\n🎉 API validation test completed");
}

// Run test (commented out since it requires a running server)
console.log("💡 API validation test script created");
console.log("To run: Start your server and uncomment the testAPIValidation() call");
// testAPIValidation(); 