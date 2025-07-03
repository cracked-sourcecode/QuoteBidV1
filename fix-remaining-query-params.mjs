import fs from 'fs';
import path from 'path';

const emailTemplateFiles = [
  'server/email-templates/billing-confirmation.html',
  'server/email-templates/subscription-renewal-failed.html'
];

function fixRemainingQueryParams() {
  console.log('🔧 Fixing remaining query parameter URLs to use hash-based format...\n');
  
  let totalFixed = 0;
  
  emailTemplateFiles.forEach(filePath => {
    try {
      // Read the file
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Replace billing-related query parameters with hash-based URLs
      const updatedContent = content
        .replace(/\/account\?tab=billing(&[^"]*)?/g, '/account#billing')
        .replace(/https:\/\/quotebid\.co\/account\?tab=billing(&[^"]*)?/g, 'https://quotebid.co/account#billing');
      
      // Only write if there were changes
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Fixed: ${path.basename(filePath)}`);
        totalFixed++;
      } else {
        console.log(`⏭️  No changes needed: ${path.basename(filePath)}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Files fixed: ${totalFixed}`);
  console.log(`📧 Total files processed: ${emailTemplateFiles.length}`);
  console.log(`\n🎯 Changes made:`);
  console.log(`  - Changed '/account?tab=billing' → '/account#billing'`);
  console.log(`  - Removed UTM parameters and other query strings`);
  console.log(`  - All email links now use consistent hash-based URLs`);
}

fixRemainingQueryParams(); 