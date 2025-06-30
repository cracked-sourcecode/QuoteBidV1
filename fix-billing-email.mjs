#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'server', 'email-templates', 'billing-confirmation.html');

// New billing confirmation email with proper table structure and correct billing
// Using regular string to avoid template literal conflicts
const newBillingTemplate = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>Payment Confirmation - QuoteBid</title>\n' +
'  <!--[if mso]>\n' +
'  <noscript>\n' +
'    <xml>\n' +
'      <o:OfficeDocumentSettings>\n' +
'        <o:PixelsPerInch>96</o:PixelsPerInch>\n' +
'      </o:OfficeDocumentSettings>\n' +
'    </xml>\n' +
'  </noscript>\n' +
'  <![endif]-->\n' +
'</head>\n' +
'<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;">\n' +
'\n' +
'  <!-- Main Container -->\n' +
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">\n' +
'    <tr>\n' +
'      <td align="center" style="padding: 40px 20px;">\n' +
'        \n' +
'        <!-- Email Container -->\n' +
'        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;">\n' +
'          \n' +
'          <!-- Header Section -->\n' +
'          <tr>\n' +
'            <td style="background: #f8fafc; padding: 40px 40px 32px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">\n' +
'              \n' +
'              <!-- Logo -->\n' +
'              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px auto;">\n' +
'                <tr>\n' +
'                  <td style="text-align: center;">\n' +
'                    <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #1f2937; line-height: 1;">\n' +
'                      <span style="color: #1f2937;">Quote</span><span style="color: #6366f1;">Bid</span>\n' +
'                    </div>\n' +
'                  </td>\n' +
'                  <td style="vertical-align: top; padding-left: 8px; padding-top: 2px;">\n' +
'                    <div style="background: #6366f1; color: #ffffff; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 12px; text-align: center;">\n' +
'                      BETA\n' +
'                    </div>\n' +
'                  </td>\n' +
'                </tr>\n' +
'              </table>\n' +
'              \n' +
'              <!-- Badge -->\n' +
'              <div style="background: #10b981; color: #ffffff; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-align: center; display: inline-block; margin-bottom: 16px;">\n' +
'                💳 PAYMENT CONFIRMED\n' +
'              </div>\n' +
'              \n' +
'              <!-- Title -->\n' +
'              <h1 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 22px; font-weight: 600; color: #374151; margin: 0; line-height: 1.3;">\n' +
'                Payment Successful\n' +
'              </h1>\n' +
'              \n' +
'              <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 8px 0 0 0; line-height: 1.4;">\n' +
'                Your placement has been billed successfully\n' +
'              </p>\n' +
'              \n' +
'            </td>\n' +
'          </tr>\n' +
'          \n' +
'          <!-- Main Content -->\n' +
'          <tr>\n' +
'            <td style="padding: 40px 40px;">\n' +
'              \n' +
'              <!-- Personal Greeting -->\n' +
'              <div style="margin-bottom: 24px;">\n' +
'                <h2 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">\n' +
'                  Hi {{userFirstName}},\n' +
'                </h2>\n' +
'                <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0;">\n' +
'                  Thank you! Your payment has been processed successfully. Your placement has been completed and billed to your card on file.\n' +
'                </p>\n' +
'              </div>\n' +
'              \n' +
'              <!-- Receipt Card -->\n' +
'              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">\n' +
'                \n' +
'                <!-- Receipt Header -->\n' +
'                <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">\n' +
'                  <h3 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0;">\n' +
'                    Payment Receipt\n' +
'                  </h3>\n' +
'                  <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 12px; color: #6b7280; margin: 0;">\n' +
'                    Receipt #{{receiptNumber}}\n' +
'                  </p>\n' +
'                </div>\n' +
'                \n' +
'                <!-- Article Details -->\n' +
'                <div style="margin-bottom: 20px;">\n' +
'                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
'                    <tr>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">\n' +
'                        Article:\n' +
'                      </td>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">\n' +
'                        {{articleTitle}}\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                    <tr>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">\n' +
'                        Publication:\n' +
'                      </td>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">\n' +
'                        {{publicationName}}\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                    <tr>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">\n' +
'                        Published:\n' +
'                      </td>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">\n' +
'                        {{publishDate}}\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                    <tr>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">\n' +
'                        Billing Date:\n' +
'                      </td>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #1f2937; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">\n' +
'                        {{billingDate}}\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                </div>\n' +
'                \n' +
'                <!-- Total Amount -->\n' +
'                <div style="background: #ffffff; border-radius: 8px; padding: 20px; border: 2px solid #10b981;">\n' +
'                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
'                    <tr>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 16px; color: #1f2937; font-weight: 600;">\n' +
'                        Total Charged:\n' +
'                      </td>\n' +
'                      <td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 24px; color: #10b981; font-weight: 800; text-align: right;">\n' +
'                        ${{totalAmount}}\n' +
'                      </td>\n' +
'                    </tr>\n' +
'                  </table>\n' +
'                </div>\n' +
'                \n' +
'                <!-- Payment Method -->\n' +
'                <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #bfdbfe;">\n' +
'                  <div style="display: flex; align-items: center; gap: 12px;">\n' +
'                    <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">\n' +
'                      💳\n' +
'                    </div>\n' +
'                    <div>\n' +
'                      <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; color: #1f2937; font-weight: 600; margin-bottom: 4px; font-size: 14px;">\n' +
'                        {{cardBrand}} •••• {{cardLast4}}\n' +
'                      </div>\n' +
'                      <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; color: #6b7280; font-size: 12px;">\n' +
'                        Charged on {{billingDate}}\n' +
'                      </div>\n' +
'                    </div>\n' +
'                  </div>\n' +
'                </div>\n' +
'                \n' +
'                <!-- View Billing Button -->\n' +
'                <div style="text-align: center; margin-top: 24px;">\n' +
'                  <a href="{{frontendUrl}}/account?tab=billing&utm_source=email&utm_medium=billing_confirmation&utm_campaign=billing" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 16px; font-weight: 600; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);">\n' +
'                    📊 View All Billing →\n' +
'                  </a>\n' +
'                </div>\n' +
'              </div>\n' +
'              \n' +
'              <!-- Support Info -->\n' +
'              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #3b82f6;">\n' +
'                <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 14px; color: #1e40af; margin: 0; text-align: center;">\n' +
'                  💬 <strong>Questions about this charge?</strong> Contact our support team or view your complete billing history in your account.\n' +
'                </p>\n' +
'              </div>\n' +
'              \n' +
'            </td>\n' +
'          </tr>\n' +
'          \n' +
'          <!-- Footer -->\n' +
'          <tr>\n' +
'            <td style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">\n' +
'              <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">\n' +
'                © 2025 QuoteBid Inc. · \n' +
'                <a href="{{frontendUrl}}/terms" style="color: #6b7280; text-decoration: none;">Terms</a> · \n' +
'                <a href="{{frontendUrl}}/privacy" style="color: #6b7280; text-decoration: none;">Privacy</a>\n' +
'              </p>\n' +
'              <p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">\n' +
'                <a href="{{frontendUrl}}/account?tab=notifications" style="color: #9ca3af; text-decoration: none;">Email Preferences</a>\n' +
'              </p>\n' +
'            </td>\n' +
'          </tr>\n' +
'          \n' +
'        </table>\n' +
'        \n' +
'      </td>\n' +
'    </tr>\n' +
'  </table>\n' +
'  \n' +
'</body>\n' +
'\n' +
'<!-- Mobile-Optimized CSS for Email Clients -->\n' +
'<style type="text/css">\n' +
'  /* Mobile responsive - email-safe optimizations */\n' +
'  @media only screen and (max-width: 600px) {\n' +
'    /* Container adjustments */\n' +
'    table[role="presentation"] {\n' +
'      width: 100% !important;\n' +
'      min-width: 320px !important;\n' +
'    }\n' +
'    \n' +
'    /* Header optimizations */\n' +
'    td[style*="padding: 40px 40px 32px 40px"] {\n' +
'      padding: 24px 20px 20px 20px !important;\n' +
'    }\n' +
'    \n' +
'    /* Logo and title scaling */\n' +
'    div[style*="font-size: 28px"] {\n' +
'      font-size: 24px !important;\n' +
'    }\n' +
'    \n' +
'    h1[style*="font-size: 22px"] {\n' +
'      font-size: 18px !important;\n' +
'    }\n' +
'    \n' +
'    h2[style*="font-size: 18px"] {\n' +
'      font-size: 16px !important;\n' +
'    }\n' +
'    \n' +
'    /* Content padding */\n' +
'    td[style*="padding: 40px 40px"] {\n' +
'      padding: 24px 20px !important;\n' +
'    }\n' +
'    \n' +
'    /* Button optimization for touch */\n' +
'    a[style*="padding: 16px 32px"] {\n' +
'      padding: 14px 24px !important;\n' +
'      font-size: 15px !important;\n' +
'    }\n' +
'    \n' +
'    /* Footer adjustments */\n' +
'    td[style*="padding: 32px 40px"] {\n' +
'      padding: 24px 20px !important;\n' +
'    }\n' +
'    \n' +
'    /* Card padding adjustments */\n' +
'    div[style*="padding: 24px"] {\n' +
'      padding: 16px !important;\n' +
'    }\n' +
'    \n' +
'    div[style*="padding: 20px"] {\n' +
'      padding: 16px !important;\n' +
'    }\n' +
'  }\n' +
'</style>\n' +
'\n' +
'</html>';

function updateBillingTemplate() {
  console.log('🔧 Fixing Billing Confirmation Email...\n');
  console.log('✨ Changes being made:');
  console.log('  ✅ Proper table structure (like other emails)');
  console.log('  ✅ Light theme with consistent styling');
  console.log('  ✅ Fixed billing breakdown - just total amount');
  console.log('  ❌ REMOVED: Confusing "placement fee" and "platform fee"');
  console.log('  ✅ ADDED: Simple total charged amount');
  console.log('');
  
  try {
    fs.writeFileSync(templatePath, newBillingTemplate, 'utf8');
    console.log('✅ Billing confirmation email updated successfully!');
    console.log('📧 Template now matches other email styling');
    console.log('💰 Billing shows just the total amount (no fee breakdown)');
    return true;
  } catch (error) {
    console.error('❌ Error updating billing template:', error.message);
    return false;
  }
}

if (updateBillingTemplate()) {
  console.log('\n🎉 Billing email fixed!');
  console.log('📬 Ready to send updated version');
} else {
  console.log('\n❌ Failed to update billing email');
  process.exit(1);
} 