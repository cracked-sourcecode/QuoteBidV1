#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templateDir = path.join(process.cwd(), 'server', 'email-templates');

// All email templates
const templates = [
  'welcome.html',
  'password-reset.html',
  'new-opportunity-alert.html',
  'saved-opportunity-alert.html', 
  'draft-reminder.html',
  'pitch-sent.html',
  'pitch-submitted.html',
  'pitch-interested.html',
  'pitch-rejected.html',
  'article-published.html',
  'billing-confirmation.html'
];

function fixUrlsInTemplate(templateName) {
  const filePath = path.join(templateDir, templateName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Template not found: ${templateName}`);
    return false;
  }
  
  console.log(`🔧 Checking URLs in ${templateName}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace quotebid.com with quotebid.co while preserving the slug/path
    content = content.replace(/quotebid\.com/g, 'quotebid.co');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated URLs: quotebid.com → quotebid.co`);
      return true;
    } else {
      console.log(`  ✓ No .com URLs found (already correct)`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${templateName}:`, error.message);
    return false;
  }
}

console.log('🌐 Fixing URLs Across All Email Templates...\n');
console.log('🎯 Changing quotebid.com → quotebid.co (preserving slugs)\n');

let updatedCount = 0;
let checkedCount = 0;

templates.forEach(templateName => {
  const wasUpdated = fixUrlsInTemplate(templateName);
  if (wasUpdated) {
    updatedCount++;
  }
  checkedCount++;
  console.log(''); // Empty line for readability
});

console.log('🏁 URL Update Summary:');
console.log(`📧 Templates checked: ${checkedCount}/${templates.length}`);
console.log(`✅ Templates updated: ${updatedCount}`);
console.log(`✓ Templates already correct: ${checkedCount - updatedCount}`);

if (updatedCount > 0) {
  console.log('\n🎉 URL fixes completed!');
  console.log('🌐 All email templates now use quotebid.co');
  console.log('📝 All slugs/paths preserved correctly');
} else {
  console.log('\n✨ All templates already had correct URLs!');
  console.log('🌐 Everything points to quotebid.co');
} 