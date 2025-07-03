import fs from 'fs';
import path from 'path';

const emailTemplateFiles = [
  'server/email-templates/pitch-interested.html',
  'server/email-templates/draft-reminder.html', 
  'server/email-templates/welcome.html',
  'server/email-templates/billing-confirmation.html',
  'server/email-templates/saved-opportunity-alert.html',
  'server/email-templates/pitch-sent.html',
  'server/email-templates/pitch-submitted.html',
  'server/email-templates/new-opportunity-alert.html',
  'server/email-templates/opportunity-alert.html',
  'server/email-templates/password-reset.html',
  'server/email-templates/billing-payment.html',
  'server/email-templates/pitch-rejected.html',
  'server/email-templates/article-published.html',
  'server/email-templates/subscription-renewal-failed.html'
];

function fixEmailPreferencesLinks() {
  console.log('🔧 Fixing email preferences links to use hash-based URLs...\n');
  
  let totalFixed = 0;
  
  emailTemplateFiles.forEach(filePath => {
    try {
      // Read the file
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Replace query parameter with hash-based URL
      const updatedContent = content
        .replace(/\/account\?tab=email-preferences/g, '/account#email-preferences')
        .replace(/https:\/\/quotebid\.co\/account\?tab=email-preferences/g, 'https://quotebid.co/account#email-preferences');
      
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
  console.log(`  - Changed '/account?tab=email-preferences' → '/account#email-preferences'`);
  console.log(`  - Updated to use hash-based URLs instead of query parameters`);
  console.log(`  - Now clicking "Email Preferences" will properly switch to the Email Preferences tab`);
}

fixEmailPreferencesLinks(); 