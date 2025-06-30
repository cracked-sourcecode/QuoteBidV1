#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'server', 'email-templates', 'billing-confirmation.html');

console.log('🔧 Updating Billing Email - Adding Article Link & Fixing Card Styling...\n');

try {
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // 1. Add article link to the article title
  const articleTitlePattern = /<td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">\s*{{articleTitle}}\s*<\/td>/;
  
  const newArticleTitle = `<td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                        <a href="{{articleUrl}}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">{{articleTitle}} →</a>
                      </td>`;
  
  template = template.replace(articleTitlePattern, newArticleTitle);
  
  // 2. Fix the credit card container styling - remove flexbox which doesn't work well in emails
  const cardContainerPattern = /<div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #bfdbfe;">\s*<div style="display: flex; align-items: center; gap: 12px;">\s*<div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">\s*💳\s*<\/div>\s*<div>\s*<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; font-weight: 600; margin-bottom: 4px; font-size: 14px;">\s*{{cardBrand}} •••• {{cardLast4}}\s*<\/div>\s*<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; font-size: 12px;">\s*Charged on {{billingDate}}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
  
  const newCardContainer = `<div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #bfdbfe;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width: 50px; vertical-align: top; padding-right: 12px;">
                        <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 8px; text-align: center; line-height: 40px; font-size: 18px;">
                          💳
                        </div>
                      </td>
                      <td style="vertical-align: top;">
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; font-weight: 600; margin-bottom: 4px; font-size: 14px;">
                          {{cardBrand}} •••• {{cardLast4}}
                        </div>
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; font-size: 12px;">
                          Charged on {{billingDate}}
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>`;
  
  template = template.replace(cardContainerPattern, newCardContainer);
  
  // Write the updated template
  fs.writeFileSync(templatePath, template, 'utf8');
  
  console.log('✅ Billing email updated successfully!');
  console.log('🔗 Added: Article link in the article title');
  console.log('💳 Fixed: Credit card container using table layout');
  console.log('📧 Template now includes {{articleUrl}} variable');
  
} catch (error) {
  console.error('❌ Error updating billing template:', error.message);
  process.exit(1);
}

console.log('\n🎉 Billing email improvements completed!');
console.log('📬 Ready to send updated version with article link'); 