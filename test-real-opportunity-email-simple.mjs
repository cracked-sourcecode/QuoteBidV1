import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file directly
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = 'https://quotebid.co';
const emailTo = 'ben@rubiconprgroup.com';

// Helper function to run database query
async function runQuery(query) {
  return new Promise((resolve, reject) => {
    const process = spawn('psql', [process.env.DATABASE_URL, '-c', query, '-t', '-A'], { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Database query failed: ${stderr}`));
      }
    });
  });
}

async function testRealOpportunityEmail() {
  try {
    console.log('Fetching real opportunity from database...');
    
    // Query for latest open opportunity with publication
    const query = `
      SELECT 
        o.id,
        o.title,
        o.request_type,
        o.description,
        o.deadline,
        o.current_price,
        o.minimum_bid,
        o.industry,
        p.name as publication_name,
        p.type as publication_type
      FROM opportunities o
      LEFT JOIN publications p ON o.publication_id = p.id
      WHERE o.status = 'open'
      ORDER BY o.created_at DESC
      LIMIT 1;
    `;
    
    const result = await runQuery(query);
    
    let opportunity;
    if (result.length === 0) {
      console.log('No open opportunities found, using test data...');
      opportunity = {
        id: 999,
        title: 'Test Fintech Innovation Expert Needed',
        request_type: 'Expert quotes and insights',
        description: 'Looking for fintech experts to comment on new banking regulations',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        current_price: '285.00',
        minimum_bid: '250',
        industry: 'Finance',
        publication_name: 'Bloomberg',
        publication_type: 'News'
      };
    } else {
      // Parse the result
      const fields = result.split('|');
      opportunity = {
        id: fields[0],
        title: fields[1],
        request_type: fields[2],
        description: fields[3],
        deadline: fields[4],
        current_price: fields[5],
        minimum_bid: fields[6],
        industry: fields[7],
        publication_name: fields[8],
        publication_type: fields[9]
      };
      console.log('Found opportunity:', opportunity);
    }
    
    console.log('Loading email template...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/new-opportunity-alert.html'), 'utf8');
    
    // Format deadline
    const deadlineDate = new Date(opportunity.deadline);
    const now = new Date();
    const timeDiff = deadlineDate - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const bidDeadline = daysDiff > 0 ? `${daysDiff} days` : 'Less than 1 day';
    
    // Apply real data replacements
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{publicationType}}': opportunity.publication_name || 'Bloomberg',
      '{{title}}': opportunity.title || 'Test Opportunity',
      '{{requestType}}': opportunity.request_type || 'Expert quotes and insights',
      '{{bidDeadline}}': bidDeadline,
      '{{opportunityId}}': opportunity.id.toString(),
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('Applying replacements:', replacements);
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('Sending email...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: `New opportunity in ${opportunity.publication_name || 'Bloomberg'} has been added to QuoteBid`,
      html: emailHtml,
    });
    
    console.log('✅ Test email sent successfully with real opportunity data!');
    console.log(`📧 Opportunity: ${opportunity.title}`);
    console.log(`📰 Publication: ${opportunity.publication_name || 'Bloomberg'}`);
    console.log(`🎯 Request Type: ${opportunity.request_type || 'Expert quotes and insights'}`);
    console.log(`⏰ Deadline: ${bidDeadline}`);
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    
    // Fallback to test data if database query fails
    console.log('Using fallback test data...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/new-opportunity-alert.html'), 'utf8');
    
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{publicationType}}': 'Bloomberg',
      '{{title}}': 'Fintech Innovation Expert Needed for Breaking News',
      '{{requestType}}': 'Expert quotes and insights for fintech regulation story',
      '{{bidDeadline}}': '2 days',
      '{{opportunityId}}': '999',
      '{{frontendUrl}}': frontendUrl
    };
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    try {
      await resend.emails.send({
        from: 'QuoteBid <noreply@quotebid.co>',
        to: [emailTo],
        subject: 'New opportunity in Bloomberg has been added to QuoteBid',
        html: emailHtml,
      });
      
      console.log('✅ Fallback test email sent successfully!');
    } catch (fallbackError) {
      console.error('❌ Fallback email also failed:', fallbackError);
    }
  }
}

testRealOpportunityEmail().catch(console.error); 