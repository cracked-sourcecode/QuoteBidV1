#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templateDir = path.join(process.cwd(), 'server', 'email-templates');

// Templates to update (already updated: welcome, password-reset, new-opportunity-alert, saved-opportunity-alert, draft-reminder)
const templatesToUpdate = [
  'pitch-sent.html',
  'pitch-submitted.html', 
  'pitch-interested.html',
  'pitch-rejected.html',
  'article-published.html',
  'billing-confirmation.html'
];

const fontUpdates = [
  // Main title: 28px -> 22px, weight 800 -> 700
  {
    find: /font-size:\s*28px;[\s\S]*?font-weight:\s*800;/g,
    replace: 'font-size: 22px;\n      font-weight: 700;'
  },
  // Subtitle: 16px -> 14px  
  {
    find: /(\.subtitle[\s\S]*?font-size:\s*)16px;/g,
    replace: '$114px;'
  },
  // Message text: 16px -> 14px
  {
    find: /(message-text[\s\S]*?font-size:\s*)16px;/g,
    replace: '$114px;'
  },
  // Opportunity title: 20px -> 18px
  {
    find: /(opportunity-title[\s\S]*?font-size:\s*)20px;/g,
    replace: '$118px;'
  },
  // Price info: 24px -> 20px, weight 800 -> 700
  {
    find: /(price-info[\s\S]*?font-size:\s*)24px;([\s\S]*?font-weight:\s*)800;/g,
    replace: '$120px;$2700;'
  },
  // CTA button: 18px -> 16px, padding 16px 32px -> 14px 28px, weight 700 -> 600
  {
    find: /(cta-button[\s\S]*?padding:\s*)16px 32px;([\s\S]*?font-size:\s*)18px;([\s\S]*?font-weight:\s*)700;/g,
    replace: '$114px 28px;$216px;$3600;'
  }
];

const simpleFooter = `    <div style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
        © 2025 QuoteBid Inc. · 
        <a href="{{frontendUrl}}/terms" style="color: #6b7280; text-decoration: none;">Terms</a> · 
        <a href="{{frontendUrl}}/privacy" style="color: #6b7280; text-decoration: none;">Privacy</a>
      </p>
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
        <a href="{{frontendUrl}}/unsubscribe" style="color: #9ca3af; text-decoration: none;">Unsubscribe</a> · 
        <a href="{{frontendUrl}}/notifications/settings" style="color: #9ca3af; text-decoration: none;">Email Preferences</a>
      </p>
    </div>`;

function updateTemplate(templateName) {
  const filePath = path.join(templateDir, templateName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Template not found: ${templateName}`);
    return false;
  }
  
  console.log(`📝 Updating ${templateName}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply font size updates
    fontUpdates.forEach((update, index) => {
      const beforeLength = content.length;
      content = content.replace(update.find, update.replace);
      if (content.length !== beforeLength) {
        console.log(`  ✅ Applied font update ${index + 1}`);
      }
    });
    
    // Replace complex footer with simple footer - look for the footer div pattern
    const footerPattern = /<div class="footer">[\s\S]*?<\/div>\s*<\/div>\s*<\/body>/;
    if (footerPattern.test(content)) {
      content = content.replace(footerPattern, `${simpleFooter}
  </div>
</body>`);
      console.log(`  ✅ Updated footer to simple utility style`);
    }
    
    // Remove unused footer CSS classes
    const footerCSSPattern = /\.footer\s*\{[\s\S]*?margin:\s*8px\s*0;\s*\}/;
    if (footerCSSPattern.test(content)) {
      content = content.replace(footerCSSPattern, '');
      console.log(`  ✅ Removed unused footer CSS`);
    }
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${templateName} updated successfully!\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating ${templateName}:`, error.message);
    return false;
  }
}

console.log('🚀 Starting Email Template Font & Footer Updates...\n');

let successCount = 0;
let failCount = 0;

templatesToUpdate.forEach(templateName => {
  const success = updateTemplate(templateName);
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log('🏁 Update Summary:');
console.log(`✅ Successfully updated: ${successCount}/${templatesToUpdate.length} templates`);
console.log(`❌ Failed: ${failCount}/${templatesToUpdate.length} templates`);

if (successCount === templatesToUpdate.length) {
  console.log('\n🎉 All email templates updated with smaller fonts and simple utility footer!');
  console.log('📧 Ready to send updated emails to ben@rubiconprgroup.com');
} else {
  console.log('\n⚠️  Some templates had issues - check the logs above');
} 