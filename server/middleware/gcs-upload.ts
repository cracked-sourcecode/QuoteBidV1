import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { Request } from 'express';

// Initialize Google Cloud Storage
let storage: Storage;

if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
  // Render: Use individual environment variables
  // Fix private key formatting - replace literal \n with actual newlines
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .replace(/"/g, ''); // Remove any quotes
  
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}`,
    universe_domain: 'googleapis.com'
  };
  
  console.log('🔑 Using individual environment variables for GCS auth');
  console.log('📧 Client email:', process.env.GOOGLE_CLOUD_CLIENT_EMAIL);
  console.log('🆔 Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
  
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: credentials,
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // Fallback: Use JSON credentials from environment variable
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  console.log('🔑 Using JSON blob for GCS auth');
  storage = new Storage({
    projectId: 'ecstatic-valve-465521-v6',
    credentials: credentials,
  });
} else {
  // Local development or Cloud Run: Use Application Default Credentials
  console.log('🔑 Using Application Default Credentials for GCS auth');
  storage = new Storage({
    projectId: 'ecstatic-valve-465521-v6',
  });
}

const bucket = storage.bucket('quotebid-uploads');

// Custom storage engine for Google Cloud Storage
class GoogleCloudStorage implements multer.StorageEngine {
  _handleFile(req: Request, file: Express.Multer.File, cb: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
    // Determine folder based on request path
    let folder = 'misc';
    if (req.path.includes('/avatar')) {
      folder = 'avatars';
    } else if (req.path.includes('/publication-logo')) {
      folder = 'publications';
    } else if (req.path.includes('/agreement')) {
      folder = 'agreements';
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    const filename = `${folder}/${uniqueSuffix}.${extension}`;

    // Create a write stream to Google Cloud Storage
    const gcsFile = bucket.file(filename);
    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', (err) => {
      cb(err);
    });

    stream.on('finish', () => {
      // File uploaded successfully
      const publicUrl = `https://storage.googleapis.com/quotebid-uploads/${filename}`;
      
      cb(null, {
        filename: filename,
        path: publicUrl,
      });
    });

    // Pipe the file buffer to Google Cloud Storage
    file.stream.pipe(stream);
  }

  _removeFile(req: Request, file: Express.Multer.File, cb: (error: Error | null) => void): void {
    // Extract filename from path
    const filename = file.filename;
    const gcsFile = bucket.file(filename);
    
    gcsFile.delete((err) => {
      cb(err);
    });
  }
}

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // For publication logos, enforce PNG only
  if (req.path.includes('/publication-logo')) {
    if (file.mimetype !== 'image/png') {
      console.log(`Rejected publication logo: ${file.originalname} with MIME type ${file.mimetype} (PNG required)`);
      return cb(new Error('Publication logos must be PNG format!'));
    }
    console.log(`Accepted PNG publication logo: ${file.originalname}`);
    cb(null, true);
  } else {
    // For other uploads (avatars, etc.), accept any image
    if (!file.mimetype.startsWith('image/')) {
      console.log(`Rejected file upload: ${file.originalname} with MIME type ${file.mimetype}`);
      return cb(new Error('Only image files are allowed!'));
    }
    console.log(`Accepted file upload: ${file.originalname} with MIME type ${file.mimetype}`);
    cb(null, true);
  }
};

// Create the multer instance with Google Cloud Storage
const gcsUpload = multer({
  storage: new GoogleCloudStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

export default gcsUpload; 