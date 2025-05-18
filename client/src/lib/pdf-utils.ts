import { getSignupEmail } from './signup-wizard';
import { apiRequest } from './queryClient';
import { apiFetch } from '@/lib/apiFetch';

interface SignatureInfo {
  signature: string;
  name: string;
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  ipAddress?: string;
}

/**
 * Generate a PDF document containing the agreement and signature
 * @param agreementHtml The HTML content of the agreement
 * @param signatureInfo Information about the signature
 * @returns PDF data as a Blob
 */
export async function generateAgreementPDF(
  agreementHtml: string,
  signatureInfo: SignatureInfo
): Promise<Blob> {
  try {
    // Use an external PDF generation service
    const response = await apiFetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent: agreementHtml,
        signature: signatureInfo.signature,
        name: signatureInfo.name,
        timestamp: signatureInfo.timestamp,
        formattedDate: signatureInfo.formattedDate,
        formattedTime: signatureInfo.formattedTime,
        ipAddress: signatureInfo.ipAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Upload a signed agreement PDF to the server
 * @param userId User ID (optional, can be 0 for users in signup flow)
 * @param pdfData PDF data as a Blob
 * @returns Response from the server
 */
export async function uploadAgreementPDF(
  userId: number,
  pdfData: Blob,
  ipAddress?: string
): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('pdf', pdfData, 'agreement.pdf');
    
    // Use the email from localStorage if no userId is provided (during signup process)
    const email = getSignupEmail();
    if (!userId && email) {
      formData.append('email', email);
    } else {
      formData.append('userId', userId.toString());
    }

    if (ipAddress) {
      formData.append('ipAddress', ipAddress);
    }

    const response = await apiFetch('/api/upload-agreement', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload agreement');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading agreement:', error);
    throw error;
  }
}

/**
 * Download a previously signed agreement PDF
 * @param userId User ID
 * @returns PDF data as a Blob
 */
export async function downloadAgreementPDF(userId: number): Promise<Blob> {
  try {
    const response = await apiFetch(`/api/download-agreement/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to download agreement');
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error downloading agreement:', error);
    throw error;
  }
}