# Agreement PDF Process

## How Agreement PDFs Are Generated and Saved

This document outlines how user agreement PDFs are created during signup and how they are stored. Although the agreement text is rendered from HTML, the final record should be a scanned PDF of the signed document rather than just the template output.

### 1. During Signup (User Flow)
1. The frontend collects the HTML agreement text, the user's full name, signature image, signing date and time, and their IP address.
2. It sends this data to `/api/generate-pdf` using `generateAgreementPDF`.
3. The backend handler `handleGeneratePDF` renders the HTML, appends the signature page with the name, date, time, and IP address, and returns the PDF file.
4. The user prints, signs, and **scans** the agreement. The scanned PDF is then uploaded via `/api/upload-agreement`, which saves the file to `uploads/agreements/` and stores the URL in the user's record.

### 2. What's in the PDF?
The generated PDF includes:
- The full agreement text
- The user's name
- The signature image
- The date and time of signing
- Optionally the IP address used during signing
- The scanned pages of the signed agreement

### 3. What's Displayed in the App?
When displaying a signed agreement, the frontend checks `agreementPdfUrl` on the user record. If present, the PDF is shown via an `<iframe>` or download link. If the URL is missing or the PDF was not generated correctly, only the plain agreement text may be shown instead.

### Troubleshooting
- **PDF Generation Step Failing** – verify `handleGeneratePDF` receives name, signature, date, and IP address and embeds them in the PDF.
- **PDF Not Uploaded or Linked** – ensure `/api/upload-agreement` saves the PDF to disk and updates `agreementPdfUrl` in the database.
- **Frontend Not Showing the PDF** – confirm the component uses the `agreementPdfUrl` to render or link the PDF.

