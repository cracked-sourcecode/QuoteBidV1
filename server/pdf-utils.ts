import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { getDb } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * Generate a professional PDF agreement with proper formatting
 * @param user The user object for which to generate the PDF
 * @returns Base64 encoded PDF data with data URI prefix
 */
export function generateProfessionalPDF(user: any): string {
  // Get the current date for display in the PDF
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate a unique reference ID for the document
  const referenceId = randomBytes(4).toString('hex').toUpperCase();
  
  // Record user IP from the database
  const userIpAddress = user.agreementIpAddress || "IP not recorded at signing";
  
  // User full name or username
  const userName = user.fullName || user.username;
  
  // Create a PDF template with all variables properly interpolated
  const pdfTemplate = `
    %PDF-1.4
    1 0 obj
    <</Type /Catalog /Pages 2 0 R>>
    endobj
    2 0 obj
    <</Type /Pages /Kids [3 0 R] /Count 1>>
    endobj
    3 0 obj
    <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>> /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]>> /MediaBox [0 0 595 842] /Contents 5 0 R>>
    endobj
    4 0 obj
    <</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>
    endobj
    5 0 obj
    <</Length 2300>>
    stream
    BT
    /F1 16 Tf
    1 0 0 1 50 800 Tm
    (RUBICON PR Media Services Agreement) Tj
    /F1 12 Tf
    1 0 0 1 50 780 Tm
    (Document Reference: RPM-${referenceId}) Tj
    1 0 0 1 400 780 Tm
    (Date: ${currentDate}) Tj
    1 0 0 1 50 750 Tm
    (PLATFORM ACCESS AGREEMENT) Tj
    1 0 0 1 50 730 Tm
    (Effective Date: Upon Acceptance by User) Tj
    1 0 0 1 50 710 Tm
    (Provider: Rubicon PR Group, LLC, a Delaware company) Tj
    1 0 0 1 50 690 Tm
    (User: ${userName}) Tj
    1 0 0 1 50 650 Tm
    (1. SERVICES) Tj
    /F1 11 Tf
    1 0 0 1 50 630 Tm
    (Rubicon PR Group provides access to its media matchmaking platform, including opportunities to) Tj
    1 0 0 1 50 615 Tm
    (connect with journalists, submit pitches, participate in bidding activity, and track media coverage) Tj
    1 0 0 1 50 600 Tm
    (placements, subject to the terms and conditions set forth herein.) Tj
    1 0 0 1 50 580 Tm
    (By signing this agreement, you accept and agree to be bound by these terms and conditions, including) Tj
    1 0 0 1 50 565 Tm
    (payment obligations for successful media placements and compliance with all communication guidelines.) Tj
    1 0 0 1 50 535 Tm
    (2. PAYMENT TERMS) Tj
    /F1 11 Tf
    1 0 0 1 50 515 Tm
    (All successful pitches resulting in media coverage are subject to a placement fee based on the final) Tj
    1 0 0 1 50 500 Tm
    (bid amount, plus any applicable tariffs. Payment is due upon receipt of invoice. Failure to pay) Tj
    1 0 0 1 50 485 Tm
    (qualifying placement fees may result in suspension of platform access.) Tj
    1 0 0 1 50 455 Tm
    (3. CONFIDENTIALITY) Tj
    /F1 11 Tf
    1 0 0 1 50 435 Tm
    (You agree to maintain the confidentiality of all proprietary information, including but not limited) Tj
    1 0 0 1 50 420 Tm
    (to pricing, journalist contact information, and proprietary algorithms used in the platform.) Tj
    1 0 0 1 50 390 Tm
    (ATTESTATION:) Tj
    /F1 11 Tf
    1 0 0 1 50 370 Tm
    (By signing this agreement, I attest that I have read, understand, and agree to abide by all terms) Tj
    1 0 0 1 50 355 Tm
    (and conditions set forth in this agreement. I understand that failure to comply with these terms) Tj
    1 0 0 1 50 340 Tm
    (may result in suspension or immediate termination of my access to the platform.) Tj
    1 0 0 1 50 300 Tm
    (Signature:) Tj
    1 0 0 1 120 300 Tm
    (________________________________) Tj
    1 0 0 1 50 270 Tm
    (Publisher:) Tj
    1 0 0 1 120 270 Tm
    (Rubicon PR Group, LLC) Tj
    1 0 0 1 50 240 Tm
    (Date:) Tj
    1 0 0 1 120 240 Tm
    (${currentDate}) Tj
    1 0 0 1 50 200 Tm
    (This agreement was electronically signed.) Tj
    1 0 0 1 50 185 Tm
    (IP Address: ${userIpAddress} | Document ID: RPM-${referenceId}) Tj
    ET
    endstream
    endobj
    xref
    0 6
    0000000000 65535 f
    0000000010 00000 n
    0000000056 00000 n
    0000000111 00000 n
    0000000255 00000 n
    0000000353 00000 n
    trailer
    <</Size 6 /Root 1 0 R>>
    startxref
    2653
    %%EOF
  `.replace('${referenceId}', referenceId)
   .replace('${currentDate}', currentDate)
   .replace('${userName}', userName)
   .replace('${userIpAddress}', userIpAddress);
   
  // Convert the PDF template to base64
  const base64PDF = Buffer.from(pdfTemplate).toString('base64');
  
  return `data:application/pdf;base64,${base64PDF}`;
}

/**
 * Save the PDF to disk and return its relative path.
 * Database updates are handled elsewhere.
 */
/**
 * Utility function to create a fresh agreement PDF from a template
 * @param userId The user ID
 * @param pdfData Base64 encoded PDF data
 * @returns File path to the saved PDF
 */
export async function createAgreementPDF(userId: number, pdfData: string): Promise<string> {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (err: any) {
        // Handle case where another process might have created it concurrently
        if (!fs.existsSync(uploadsDir)) {
          throw err; // If it still doesn't exist after the catch, rethrow
        }
        // Otherwise directory now exists, continue
      }
    }
    
    // Create a subdirectory for agreements
    const agreementsDir = path.join(uploadsDir, 'agreements');
    if (!fs.existsSync(agreementsDir)) {
      try {
        fs.mkdirSync(agreementsDir, { recursive: true });
      } catch (err: any) {
        // Handle case where another process might have created it concurrently
        if (!fs.existsSync(agreementsDir)) {
          throw err; // If it still doesn't exist after the catch, rethrow
        }
        // Otherwise directory now exists, continue
      }
    }
    
    // Create unique filename with timestamp and random element to avoid collisions
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const referenceId = randomBytes(8).toString('hex').toUpperCase(); // Increased from 4 to 8 bytes
    const filename = `agreement_${userId}_${timestamp}_${referenceId}.pdf`;
    const filepath = path.join(agreementsDir, filename);
    
    // Extract the base64 data from dataURI with proper error handling
    const base64Data = pdfData.split(';base64,').pop();
    if (!base64Data) {
      throw new Error("Invalid PDF data format: couldn't extract base64 content");
    }
    
    // Write the PDF to file using a more robust approach
    await fs.promises.writeFile(filepath, Buffer.from(base64Data, 'base64'));
    
    // Get the relative path for storage in database
    const relativeFilepath = `/uploads/agreements/${filename}`;
    return relativeFilepath;
  } catch (error: any) {
    console.error(`Failed to create agreement PDF for user ${userId}:`, error);
    throw new Error(`Failed to create agreement PDF: ${error.message}`);
  }
}

/**
 * Admin endpoint to regenerate PDFs for users with existing agreements
 */
export async function regenerateAgreementsPDF(req: Request, res: Response) {
  try {
    // Check admin authentication
    if (!req.session.adminUser) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    
    // Optional user ID parameter to regenerate just one user's agreement
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    
    // Fetch users with agreements
    let userRecords;
    if (userId) {
      userRecords = await getDb().select()
        .from(users)
        .where(eq(users.id, userId));
    } else {
      userRecords = await getDb().select()
        .from(users);
    }
    
    // Generate new PDFs with professional formatting
    const results = [];
    for (const user of userRecords) {
      try {
        // Use the professional PDF generator
        const pdfContent = generateProfessionalPDF(user);
        
        // Generate a new PDF file path
        const pdfUrl = await createAgreementPDF(user.id, pdfContent);
        
        // Update the user record with the new PDF URL
        await getDb().update(users)
          .set({
            agreementPdfUrl: pdfUrl,
            agreementSignedAt: user.agreementSignedAt || new Date()
          })
          .where(eq(users.id, user.id));
          
        results.push({
          userId: user.id,
          username: user.username,
          oldPdfUrl: user.agreementPdfUrl,
          newPdfUrl: pdfUrl,
          message: "Agreement PDF regenerated successfully"
        });
      } catch (err: any) {
        results.push({
          userId: user.id,
          username: user.username,
          error: err.message,
          message: "Failed to regenerate agreement PDF"
        });
      }
    }
    
    res.status(200).json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error: any) {
    console.error("Error regenerating agreement PDFs:", error);
    res.status(500).json({ message: "Error regenerating agreement PDFs: " + error.message });
  }
}

export async function saveAgreementPDF(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const { pdfData, ipAddress: clientIpAddress } = req.body;
    if (!pdfData) {
      return res.status(400).json({ message: "No PDF data provided" });
    }
    
    // Use the shared createAgreementPDF function which has better error handling
    const pdfUrl = await createAgreementPDF(userId, pdfData);
    
    // Get the user's IP address - prefer client-provided IP if available
    const ipAddress = clientIpAddress || 
                      req.ip || 
                      req.headers['x-forwarded-for'] || 
                      req.socket.remoteAddress || 
                      'Unknown';
    
    // Update user record with agreement URL, signed timestamp, and IP address
    await getDb().update(users)
      .set({
        agreementPdfUrl: pdfUrl,
        agreementSignedAt: new Date(),
        agreementIpAddress: typeof ipAddress === 'string' ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : 'Unknown'
      })
      .where(eq(users.id, userId));
    
    // Return success response
    res.status(200).json({
      success: true,
      pdfUrl: pdfUrl
    });
  } catch (error: any) {
    console.error("Error saving agreement PDF:", error);
    res.status(500).json({ message: "Error saving agreement PDF: " + error.message });
  }
}
