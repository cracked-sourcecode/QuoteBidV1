import { Request, Response } from 'express';
import { storage } from '../storage';
import { createAgreementPDF, generateProfessionalPDF } from '../pdf-utils';

/**
 * Serves the blank agreement PDF template
 */
export async function serveAgreementPDF(req: Request, res: Response) {
  try {
    // Get user email from query if available
    const email = req.query.email as string;
    
    // Generate a personalized PDF if email is provided
    if (email) {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate a personalized PDF
        const pdfContent = generateProfessionalPDF(user);
        return res.status(200).json({ pdfData: pdfContent });
      }
    }
    
    // Fall back to generic PDF template if no user is found
    const genericPDF = generateProfessionalPDF({
      email: email || '',
      fullName: '',
      id: 0,
      username: '',
      password: ''
    });
    
    res.status(200).json({ pdfData: genericPDF });
  } catch (error) {
    console.error('Error serving agreement PDF:', error);
    res.status(500).json({ message: 'Error generating agreement PDF' });
  }
}

/**
 * Handles uploading of signed agreement PDF
 */
export async function handleAgreementUpload(req: Request, res: Response) {
  try {
    const { pdfData, email, fullName, ipAddress } = req.body;
    
    if (!pdfData || !email) {
      return res.status(400).json({ message: 'Missing required data' });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Store the signed PDF
    const pdfUrl = await createAgreementPDF(user.id, pdfData);
    
    // Update user record with signed agreement info
    await storage.updateUser(user.id, {
      agreementPdfUrl: pdfUrl,
      agreementSignedAt: new Date(),
      agreementIpAddress: ipAddress || req.ip
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Agreement signed successfully',
      pdfUrl
    });
  } catch (error) {
    console.error('Error handling agreement upload:', error);
    res.status(500).json({ message: 'Error processing agreement upload' });
  }
}