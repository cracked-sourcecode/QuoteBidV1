#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templateDir = path.join(process.cwd(), 'server', 'email-templates');

// Templates to convert to light theme (skip utility emails which are already light)
const templatesToConvert = [
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

// Light theme color mappings based on utility emails
const colorConversions = [
  // Body background - convert dark to light
  {
    find: /background-color:\s*#0a0a0b;/g,
    replace: 'background-color: #f8fafc;'
  },
  
  // Remove dark background gradients from body
  {
    find: /background-image:\s*radial-gradient\([^;]+\);/g,
    replace: ''
  },
  
  // Container backgrounds - dark to white with light theme
  {
    find: /background:\s*linear-gradient\(145deg,\s*#0f0f23[^)]+\);/g,
    replace: 'background: #ffffff;'
  },
  
  // Header backgrounds - convert dark gradients to light
  {
    find: /background:\s*linear-gradient\(135deg,\s*rgba\(15,\s*15,\s*35[^)]+\)\);/g,
    replace: 'background: #f8fafc;'
  },
  
  // Main container borders - dark to light
  {
    find: /border:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.08\);/g,
    replace: 'border: 1px solid #e5e7eb;'
  },
  
  // Box shadows - dark to light
  {
    find: /box-shadow:\s*0\s*40px\s*80px\s*-20px\s*rgba\(0,\s*0,\s*0,\s*0\.8\)[^;]+;/g,
    replace: 'box-shadow: 0 20px 40px rgba(0,0,0,0.1);'
  },
  
  // Content background - dark transparent to light
  {
    find: /background:\s*rgba\(255,\s*255,\s*255,\s*0\.02\);/g,
    replace: 'background: #ffffff;'
  },
  
  // Text colors - white to dark
  {
    find: /color:\s*#ffffff;/g,
    replace: 'color: #1f2937;'
  },
  
  // Message text - light gray to medium gray
  {
    find: /color:\s*#e2e8f0;/g,
    replace: 'color: #4b5563;'
  },
  
  // Subtitle text - convert to utility gray
  {
    find: /color:\s*#94a3b8;/g,
    replace: 'color: #6b7280;'
  },
  
  // Border colors - dark to light
  {
    find: /border-bottom:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.08\);/g,
    replace: 'border-bottom: 1px solid #e5e7eb;'
  },
  
  // Card backgrounds - dark gradients to light
  {
    find: /background:\s*linear-gradient\(135deg,\s*rgba\(59,\s*130,\s*246,\s*0\.1\)[^)]+\);/g,
    replace: 'background: #f8fafc;'
  },
  
  {
    find: /background:\s*linear-gradient\(135deg,\s*rgba\(245,\s*158,\s*11,\s*0\.1\)[^)]+\);/g,
    replace: 'background: #f8fafc;'
  },
  
  // Card borders - convert to light theme
  {
    find: /border:\s*1px\s*solid\s*rgba\(99,\s*102,\s*241,\s*0\.3\);/g,
    replace: 'border: 1px solid #e5e7eb;'
  },
  
  {
    find: /border:\s*1px\s*solid\s*rgba\(245,\s*158,\s*11,\s*0\.3\);/g,
    replace: 'border: 1px solid #e5e7eb;'
  },
  
  // Description text in cards
  {
    find: /color:\s*#cbd5e1;/g,
    replace: 'color: #6b7280;'
  },
  
  // Contact info backgrounds - dark to light
  {
    find: /background:\s*rgba\(0,\s*0,\s*0,\s*0\.2\);/g,
    replace: 'background: #f8fafc;'
  },
  
  // Contact info borders
  {
    find: /border:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.1\);/g,
    replace: 'border: 1px solid #e5e7eb;'
  }
];

function convertTemplate(templateName) {
  const filePath = path.join(templateDir, templateName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Template not found: ${templateName}`);
    return false;
  }
  
  console.log(`🎨 Converting ${templateName} to light theme...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply color conversions
    colorConversions.forEach((conversion, index) => {
      const beforeLength = content.length;
      content = content.replace(conversion.find, conversion.replace);
      if (content.length !== beforeLength) {
        console.log(`  ✅ Applied color conversion ${index + 1}`);
      }
    });
    
    // Update Inter font to match utility emails
    content = content.replace(
      /font-family:\s*'Inter'[^;]+;/g,
      'font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;'
    );
    
    // Update main outer background to match utility gradient
    content = content.replace(
      /background:\s*linear-gradient\([^;]+\);/g,
      'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'
    );
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${templateName} converted to light theme!\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error converting ${templateName}:`, error.message);
    return false;
  }
}

console.log('🎨 Starting Light Theme Conversion...\n');
console.log('📋 Converting dark theme emails to match utility email colors\n');

let successCount = 0;
let failCount = 0;

templatesToConvert.forEach(templateName => {
  const success = convertTemplate(templateName);
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log('🏁 Light Theme Conversion Summary:');
console.log(`✅ Successfully converted: ${successCount}/${templatesToConvert.length} templates`);
console.log(`❌ Failed: ${failCount}/${templatesToConvert.length} templates`);

if (successCount === templatesToConvert.length) {
  console.log('\n🎉 All email templates converted to light theme!');
  console.log('🎨 Now matching utility email color scheme:');
  console.log('  • Light backgrounds (#f8fafc, #ffffff)');
  console.log('  • Dark text on light (#1f2937, #4b5563)');
  console.log('  • Light borders (#e5e7eb)');
  console.log('  • Blue/purple gradient outer background');
  console.log('\n📧 Ready to send light-themed emails to ben@rubiconprgroup.com');
} else {
  console.log('\n⚠️  Some templates had issues - check the logs above');
} 