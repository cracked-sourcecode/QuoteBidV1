import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config();

const sql = neon(process.env.DATABASE_URL);

console.log("🔍 Testing New Opportunity Email System...\n");

async function testOpportunityEmails() {
  try {
    // 1. Check if we have users with industries
    console.log("1️⃣ Checking users with industries:");
    const usersWithIndustries = await sql`
      SELECT email, industry, "fullName" as full_name 
      FROM users 
      WHERE industry IS NOT NULL 
      ORDER BY industry
      LIMIT 10
    `;
    
    console.log(`   📊 Found ${usersWithIndustries.length} users with industries:`);
    usersWithIndustries.forEach(user => {
      console.log(`   - ${user.email} (${user.industry})`);
    });
    
    // 2. Check recent opportunities and their industries
    console.log("\n2️⃣ Checking recent opportunities:");
    const recentOpportunities = await sql`
      SELECT id, title, industry, status, "createdAt"
      FROM opportunities 
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;
    
    console.log(`   📊 Found ${recentOpportunities.length} opportunities from last 7 days:`);
    recentOpportunities.forEach(opp => {
      console.log(`   - OPP ${opp.id}: "${opp.title}" (${opp.industry || 'NO INDUSTRY'}) - ${opp.status}`);
    });
    
    // 3. Check for potential matches
    console.log("\n3️⃣ Checking potential email matches:");
    if (recentOpportunities.length > 0 && usersWithIndustries.length > 0) {
      const industryGroups = {};
      usersWithIndustries.forEach(user => {
        if (!industryGroups[user.industry]) {
          industryGroups[user.industry] = [];
        }
        industryGroups[user.industry].push(user.email);
      });
      
      recentOpportunities.forEach(opp => {
        if (opp.industry && industryGroups[opp.industry]) {
          console.log(`   ✅ OPP ${opp.id} (${opp.industry}) → ${industryGroups[opp.industry].length} matching users`);
          console.log(`      Recipients: ${industryGroups[opp.industry].slice(0, 3).join(', ')}${industryGroups[opp.industry].length > 3 ? '...' : ''}`);
        } else {
          console.log(`   ❌ OPP ${opp.id} (${opp.industry || 'NO INDUSTRY'}) → No matching users`);
        }
      });
    }
    
    // 4. Check email template exists
    console.log("\n4️⃣ Checking email template:");
    try {
      const fs = await import('fs');
      const templateExists = fs.existsSync('server/email-templates/new-opportunity-alert.html');
      console.log(`   📧 new-opportunity-alert.html: ${templateExists ? '✅ EXISTS' : '❌ MISSING'}`);
    } catch (error) {
      console.log(`   📧 Template check failed: ${error.message}`);
    }
    
    console.log("\n🎯 RECOMMENDATION:");
    if (usersWithIndustries.length === 0) {
      console.log("   ❌ No users have industries set - emails won't trigger");
      console.log("   💡 Add industry to users: UPDATE users SET industry = 'Crypto' WHERE email = 'test@example.com'");
    } else if (recentOpportunities.every(opp => !opp.industry)) {
      console.log("   ❌ Recent opportunities missing industries - emails won't trigger");
      console.log("   💡 Create opportunity with industry matching user industries");
    } else {
      console.log("   ✅ System looks ready - create a new opportunity to test emails");
    }
    
  } catch (error) {
    console.error("❌ Error testing opportunity emails:", error);
  }
}

await testOpportunityEmails();
console.log("\n🏁 Test complete!"); 