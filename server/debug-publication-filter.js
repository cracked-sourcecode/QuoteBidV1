const { initializeDatabase } = require('./db.ts');
const { DatabaseStorage } = require('./storage.ts');

async function debugPublicationFilter() {
  console.log('🔍 DEBUGGING PUBLICATION FILTER ISSUE...\n');
  
  try {
    // Initialize database
    const { db } = initializeDatabase();
    const storage = new DatabaseStorage();
    
    console.log('✅ Database initialized\n');
    
    // Get opportunities with publications
    const opportunities = await storage.getOpportunitiesWithPublications();
    console.log(`📊 Found ${opportunities.length} opportunities\n`);
    
    if (opportunities.length > 0) {
      const sampleOpportunity = opportunities[0];
      console.log('📋 SAMPLE OPPORTUNITY STRUCTURE:');
      console.log('- ID:', sampleOpportunity.id);
      console.log('- Title:', sampleOpportunity.title);
      console.log('- Publication Object:', sampleOpportunity.publication);
      console.log('- Publication Name:', sampleOpportunity.publication?.name);
      console.log('- Publication Name Type:', typeof sampleOpportunity.publication?.name);
      console.log('- Publication Name Length:', sampleOpportunity.publication?.name?.length);
      console.log('- Publication ID:', sampleOpportunity.publication?.id);
      console.log('\n');
      
      // Check unique publication names
      const uniquePubNames = [...new Set(opportunities.map(opp => opp.publication?.name).filter(Boolean))];
      console.log('🏢 UNIQUE PUBLICATION NAMES:');
      uniquePubNames.forEach((name, idx) => {
        console.log(`${idx + 1}. "${name}" (Type: ${typeof name}, Length: ${name?.length})`);
      });
      console.log('\n');
      
      // Test filtering logic
      const testPublicationName = uniquePubNames[0];
      if (testPublicationName) {
        console.log(`🔍 TESTING FILTER WITH: "${testPublicationName}"`);
        
        const matchingOpps = opportunities.filter(opp => {
          const oppPubName = opp.publication?.name;
          const exactMatch = oppPubName === testPublicationName;
          const caseInsensitiveMatch = oppPubName?.toLowerCase() === testPublicationName?.toLowerCase();
          const trimmedMatch = oppPubName?.trim() === testPublicationName?.trim();
          
          console.log(`- Opportunity ${opp.id}: "${oppPubName}" === "${testPublicationName}" = ${exactMatch}`);
          
          return exactMatch || caseInsensitiveMatch || trimmedMatch;
        });
        
        console.log(`\n✅ FILTER RESULT: ${matchingOpps.length} of ${opportunities.length} opportunities match\n`);
      }
      
      // Test with different casing
      if (uniquePubNames.length > 0) {
        const testName = uniquePubNames[0];
        const upperCaseTest = testName.toUpperCase();
        const lowerCaseTest = testName.toLowerCase();
        
        console.log('🔤 CASE SENSITIVITY TEST:');
        console.log('Original:', testName);
        console.log('Uppercase:', upperCaseTest);
        console.log('Lowercase:', lowerCaseTest);
        
        const upperMatches = opportunities.filter(opp => opp.publication?.name === upperCaseTest);
        const lowerMatches = opportunities.filter(opp => opp.publication?.name === lowerCaseTest);
        const originalMatches = opportunities.filter(opp => opp.publication?.name === testName);
        
        console.log('Original matches:', originalMatches.length);
        console.log('Uppercase matches:', upperMatches.length);
        console.log('Lowercase matches:', lowerMatches.length);
      }
      
    } else {
      console.log('❌ No opportunities found in database');
    }
    
    // Also check publications table directly
    const publications = await storage.getPublications();
    console.log(`\n📰 PUBLICATIONS TABLE: ${publications.length} entries`);
    publications.forEach((pub, idx) => {
      console.log(`${idx + 1}. ID: ${pub.id}, Name: "${pub.name}" (Type: ${typeof pub.name}, Length: ${pub.name?.length})`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
  
  process.exit(0);
}

debugPublicationFilter(); 