#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templateDir = path.join(process.cwd(), 'server', 'email-templates');

// All templates except utility ones that are already correct
const templatesToFix = [
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

function fixTemplate(templateName) {
  const filePath = path.join(templateDir, templateName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Template not found: ${templateName}`);
    return false;
  }
  
  console.log(`🔧 Fixing ${templateName}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Fix header background - remove dark gradients
    content = content.replace(
      /\.header\s*\{[^}]*background:\s*linear-gradient\([^;]+\);[^}]*\}/gs,
      `.header {
      background: #f8fafc;
      padding: 40px 40px 32px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid #e5e7eb;
    }`
    );
    
    // 2. Fix badge backgrounds
    content = content.replace(
      /background:\s*linear-gradient\(135deg,\s*#667eea[^)]+\);/g,
      'background: #6366f1;'
    );
    
    content = content.replace(
      /background:\s*linear-gradient\(135deg,\s*#ef4444[^)]+\);/g,
      'background: #ef4444;'
    );
    
    content = content.replace(
      /background:\s*linear-gradient\(135deg,\s*#f59e0b[^)]+\);/g,
      'background: #f59e0b;'
    );
    
    // 3. Fix main title colors
    content = content.replace(
      /\.main-title\s*\{[^}]*color:\s*#1f2937;[^}]*\}/gs,
      `.main-title {
      color: #374151;
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }`
    );
    
    // 4. Fix opportunity card backgrounds
    content = content.replace(
      /\.opportunity-card\s*\{[^}]*background:\s*linear-gradient\([^;]+\);[^}]*\}/gs,
      `.opportunity-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
    }`
    );
    
    // Also fix draft-card class
    content = content.replace(
      /\.draft-card\s*\{[^}]*background:\s*linear-gradient\([^;]+\);[^}]*\}/gs,
      `.draft-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
    }`
    );
    
    // 5. Fix CTA button backgrounds and colors
    content = content.replace(
      /\.cta-button\s*\{[^}]*background:\s*linear-gradient\([^;]+\);[^}]*color:\s*#1f2937;[^}]*\}/gs,
      `.cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #707dff 0%, #423dff 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 8px 20px rgba(112, 125, 255, 0.3);
      margin: 20px 0;
      text-align: center;
      display: block;
    }`
    );
    
    // 6. Fix pitch count and urgency indicators
    content = content.replace(
      /background:\s*rgba\(245,\s*101,\s*101,\s*0\.2\);[\s\S]*?color:\s*#fca5a5;/g,
      'background: rgba(239, 68, 68, 0.1);\n      color: #dc2626;'
    );
    
    // 7. Wrap in proper table structure if not already wrapped
    if (!content.includes('<table role="presentation"')) {
      content = content.replace(
        /<body>\s*<div class="container">/,
        `<body>
  <!-- Main Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
  <div class="container">`
      );
      
      content = content.replace(
        /<\/div>\s*<\/body>/,
        `</div>
  
      </td>
    </tr>
  </table>
</body>`
      );
    }
    
    // Write the fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${templateName} fixed properly!\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error fixing ${templateName}:`, error.message);
    return false;
  }
}

console.log('🔧 Starting Proper Template Fixes...\n');
console.log('🎯 Making ALL templates match utility email structure\n');

let successCount = 0;
let failCount = 0;

templatesToFix.forEach(templateName => {
  const success = fixTemplate(templateName);
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log('🏁 Template Fix Summary:');
console.log(`✅ Successfully fixed: ${successCount}/${templatesToFix.length} templates`);
console.log(`❌ Failed: ${failCount}/${templatesToFix.length} templates`);

if (successCount === templatesToFix.length) {
  console.log('\n🎉 ALL email templates properly fixed!');
  console.log('✨ Features:');
  console.log('  • Light theme headers (#f8fafc)');
  console.log('  • Light card backgrounds (#f8fafc)');
  console.log('  • Proper text contrast');
  console.log('  • Blue CTA buttons with white text');
  console.log('  • Proper table wrapper structure');
  console.log('\n📧 Ready to send properly fixed emails!');
} else {
  console.log('\n⚠️  Some templates had issues - check the logs above');
} 