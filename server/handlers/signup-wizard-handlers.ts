import { Request, Response } from 'express';
import { getDb } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateProfessionalPDF, createAgreementPDF } from '../pdf-utils';
import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';

/**
 * Generate PDF agreement from HTML content with signature
 */
export async function handleGeneratePDF(req: Request, res: Response) {
  try {
    const { htmlContent, signature, name, timestamp, formattedDate, formattedTime } = req.body;
    
    if (!htmlContent || !signature || !name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add the agreement content
    doc.html(htmlContent, {
      callback: function(pdf) {
        // Add a page for signature
        pdf.addPage();
        
        // Add signature details
        pdf.setFontSize(14);
        pdf.text('Agreement Signature', 20, 20);
        
        pdf.setFontSize(12);
        pdf.text(`Name: ${name}`, 20, 40);
        pdf.text(`Date: ${formattedDate}`, 20, 50);
        pdf.text(`Time: ${formattedTime}`, 20, 60);
        
        // Add the signature image
        if (signature) {
          const imgData = signature.split(',')[1];
          pdf.addImage(imgData, 'PNG', 20, 70, 160, 60);
        }
        
        // Send the generated PDF
        const pdfBuffer = pdf.output('arraybuffer');
        res.contentType('application/pdf');
        res.send(Buffer.from(pdfBuffer));
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
}

/**
 * Upload PDF agreement during signup flow
 */
export async function handleSignupAgreementUpload(req: Request, res: Response) {
  try {
    const { pdf } = req.files as any;
    const { email } = req.body;
    
    if (!pdf || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'agreements');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `agreement_${user.id}_${timestamp}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    
    // Save the file
    await fs.promises.writeFile(filePath, pdf.data);
    
    // Update user record with agreement info
    await getDb()
      .update(users)
      .set({
        agreementPdfUrl: `/uploads/agreements/${filename}`,
        agreementSignedAt: new Date(),
        agreementIpAddress: req.ip || req.socket.remoteAddress || 'Unknown',
        hasAgreedToTerms: true
      })
      .where(eq(users.id, user.id));
    
    res.status(200).json({
      success: true,
      message: 'Agreement uploaded successfully',
      pdfUrl: `/uploads/agreements/${filename}`
    });
  } catch (error) {
    console.error('Error uploading agreement:', error);
    res.status(500).json({ message: 'Error uploading agreement' });
  }
}

/**
 * Provide the agreement HTML template
 */
export async function serveAgreementHTML(req: Request, res: Response) {
  try {
    // Path to the agreement HTML template
    const templatePath = path.join(process.cwd(), 'templates', 'agreement.html');
    
    // Check if the file exists
    if (fs.existsSync(templatePath)) {
      // Read and return the template
      const template = await fs.promises.readFile(templatePath, 'utf8');
      res.set('Content-Type', 'text/html');
      res.send(template);
    } else {
      // If template is not found, generate a default one
      const defaultTemplate = `
<h1>PLATFORM ACCESS AGREEMENT</h1>
<h3>Effective Date: Upon Acceptance by User</h3>
<h3>Provider: Rubicon PR Group LLC, a Delaware Limited Liability Company ("Provider")</h3>
<h3>User: The individual or entity accessing the platform ("Client," "User," or "You")</h3>

<h2>1. Introduction</h2>
<p>This Platform Access Agreement ("Agreement") governs the terms under which You access and use the proprietary PR bidding platform operated by Rubicon PR Group LLC (the "Provider"). By clicking "I Agree," creating an account, or making payment, You agree to be legally bound by this Agreement.</p>

<h2>2. Access & Subscription</h2>
<p>2.1 Platform Use. The Provider offers a digital marketplace allowing qualified users to view and respond to real media opportunities by submitting editorial pitches and placing monetary bids for consideration.</p>
<p>2.2 Monthly Subscription Fee. A recurring fee of $99.99/month grants You access to the Platform's media request database and the ability to submit bids. This is a non-refundable access fee.</p>
<p>2.3 Bidding Model. You may place a monetary bid in connection with a specific journalist's query. You will only be charged the bid amount if your pitch is selected and successfully published by the journalist or outlet.</p>
<p>2.4 Fees Go to Provider Only. All fees collected via the Platform—including subscription fees and successful bid fees—are payable solely to the Provider. No portion of any fee is paid to journalists, publishers, or media outlets, nor does the payment represent compensation to any media personnel.</p>
<p>2.5 Opportunity Fee Disclosure. The bid fee paid upon successful publication is an opportunity fee for the use of the Provider's editorial matchmaking infrastructure—not for the purchase, guarantee, or influence of content. The Provider does not and cannot guarantee media outcomes.</p>

<h2>3. No Affiliation with Media Outlets</h2>
<p>3.1 Independent Relationships. The Provider is an independent public relations firm. It is not affiliated with, endorsed by, or representative of any publication or journalist listed on the platform.</p>
<p>3.2 No Compensation to Journalists. The Provider does not compensate journalists or publications in any form. Participation by journalists is entirely voluntary and unpaid.</p>
<p>3.3 No Control Over Editorial Content. The Provider does not alter or approve the final media content. All editorial decisions are made independently by the journalists and/or publishers.</p>

<h2>4. Confidentiality, Non-Disclosure & Non-Circumvention</h2>
<p>4.1 Confidential Information. All non-public information related to platform features, journalist queries, bid structures, user analytics, pricing logic, and sourcing methodology is deemed Confidential Information.</p>
<p>4.2 Non-Disclosure Agreement (NDA). By using the Platform, You agree to maintain strict confidentiality regarding all aspects of the Platform, including the identities of journalists, content of media queries, and any correspondence facilitated via the Platform.</p>
<p>4.3 Non-Circumvention. You agree not to contact, solicit, or transact directly with any journalist, outlet, or contact introduced through the Platform, outside of the Platform itself. Any violation of this clause is grounds for immediate suspension and legal action, including injunctive relief and liquidated damages.</p>

<h2>5. Payment Terms</h2>
<p>5.1 Subscription Billing. You authorize the Provider to charge Your designated payment method $99.99 per month until canceled by You with at least 14 days' written notice.</p>
<p>5.2 Bid Payment Trigger. A successful bid is defined as a quote or contribution submitted via the Platform that is selected and published by a third-party outlet. Upon such publication, the Provider will charge Your bid amount as stated at the time of submission.</p>
<p>5.3 No Refund Policy. All subscription fees are non-refundable. Bid payments are only processed post-publication and are likewise non-refundable once confirmed.</p>

<h2>6. Disclaimers & Limitations</h2>
<p>6.1 No Guarantee. The Provider does not guarantee publication, visibility, tone, or performance of any editorial piece. Platform access is a tool—not a promise of outcomes.</p>
<p>6.2 No Editorial Control. The Provider does not control publication timelines, headline framing, editorial edits, or third-party distribution decisions.</p>
<p>6.3 Limitation of Liability. To the fullest extent permitted by law, the Provider shall not be liable for any indirect, incidental, consequential, or punitive damages. Total liability in any case shall not exceed the amount paid by You to the Provider in the past 3 months.</p>

<h2>7. Indemnification</h2>
<p>You agree to defend, indemnify, and hold harmless the Provider and its affiliates, officers, agents, and employees from any claim or demand arising from Your use of the Platform, including any breach of this Agreement, violation of law, or misuse of confidential information.</p>

<h2>8. Binding Arbitration</h2>
<p>8.1 Arbitration Clause. Any and all disputes arising under or related to this Agreement shall be resolved exclusively through final and binding arbitration administered by JAMS in New York, NY, in accordance with its rules then in effect.</p>
<p>8.2 No Court Proceedings. You expressly waive the right to bring any claims in court or to participate in any class action. Arbitration shall be private and confidential.</p>
<p>8.3 Fees & Enforcement. The prevailing party in arbitration shall be entitled to recover reasonable attorneys' fees and costs. The arbitrator's decision shall be enforceable in any court of competent jurisdiction.</p>

<h2>9. Termination</h2>
<p>The Provider reserves the right to suspend or terminate Your access without notice for:</p>
<ul>
  <li>Breach of this Agreement;</li>
  <li>Circumvention or misuse of Platform systems;</li>
  <li>Attempts to defraud, spam, or exploit the bidding process.</li>
</ul>
<p>No refunds will be issued upon termination for cause.</p>

<h2>10. General Provisions</h2>
<p>Governing Law: This Agreement shall be governed by the laws of the State of New York.</p>
<p>Force Majeure: Neither party shall be liable for delays or failure due to acts beyond reasonable control.</p>
<p>Survival: Sections 3–8 of this Agreement shall survive any expiration or termination.</p>
<p>Modifications: The Provider may update these terms upon notice posted to the Platform. Continued use constitutes acceptance.</p>

<h2>11. Acknowledgment</h2>
<p>By continuing past this point, You acknowledge that You have read, understood, and agreed to be bound by this Platform Access Agreement. You further confirm that You are of legal age and have the authority to enter into this Agreement on behalf of Yourself or Your organization.</p>
      `;
      res.set('Content-Type', 'text/html');
      res.send(defaultTemplate);
    }
  } catch (error) {
    console.error('Error serving agreement HTML:', error);
    res.status(500).json({ message: 'Error serving agreement template' });
  }
}