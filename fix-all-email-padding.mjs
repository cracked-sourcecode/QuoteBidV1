import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emailTemplatesDir = path.join(__dirname, 'server/email-templates');

// All email templates to update
const templates = [
  'saved-opportunity-alert.html',
  'pitch-interested.html', 
  'pitch-rejected.html',
  'pitch-submitted.html',
  'article-published.html',
  'draft-reminder.html',
  'billing-confirmation.html',
  'subscription-renewal-failed.html',
  'welcome.html',
  'password-reset.html',
  'billing-payment.html'
];

// Padding replacements for consistent mobile optimization
const paddingReplacements = [
  { from: 'padding: 40px 20px', to: 'padding: 20px 8px' },
  { from: 'padding: 40px 40px 32px 40px', to: 'padding: 24px 16px 20px 16px' },
  { from: 'padding: 40px 40px', to: 'padding: 24px 16px' },
  { from: 'padding: 40px', to: 'padding: 24px 16px' },
  { from: 'padding: 48px 40px', to: 'padding: 24px 16px' },
  { from: 'padding: 32px 40px', to: 'padding: 24px 16px' }
];

function updateEmailTemplate(templatePath) {
  console.log(`📧 Updating ${path.basename(templatePath)}...`);
  
  let content = fs.readFileSync(templatePath, 'utf8');
  let changed = false;

  paddingReplacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replaceAll(replacement.from, replacement.to);
      console.log(`  ✅ ${replacement.from} → ${replacement.to}`);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(templatePath, content, 'utf8');
    console.log(`  💾 Saved ${path.basename(templatePath)}`);
  } else {
    console.log(`  ➖ No changes needed`);
  }
  console.log('');
}

console.log('🚀 Optimizing all email templates for mobile...\n');

templates.forEach(template => {
  const templatePath = path.join(emailTemplatesDir, template);
  if (fs.existsSync(templatePath)) {
    updateEmailTemplate(templatePath);
  } else {
    console.log(`❌ Not found: ${template}\n`);
  }
});

console.log('✅ All email templates optimized!');
