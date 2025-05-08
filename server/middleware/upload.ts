import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure the upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
const publicationsDir = path.join(uploadDir, 'publications');
const avatarsDir = path.join(uploadDir, 'avatars');

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(publicationsDir)) {
  fs.mkdirSync(publicationsDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the correct directory based on the request path
    if (req.path.includes('/avatar')) {
      // Store avatars in the avatars directory
      cb(null, avatarsDir);
    } else {
      // Store publication logos in the publications directory
      cb(null, publicationsDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: timestamp-original.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images based on MIME type rather than just file extension
  if (!file.mimetype.startsWith('image/')) {
    console.log(`Rejected file upload: ${file.originalname} with MIME type ${file.mimetype}`);
    return cb(new Error('Only image files are allowed!'));
  }
  console.log(`Accepted file upload: ${file.originalname} with MIME type ${file.mimetype}`);
  cb(null, true);
};

// Create the multer instance
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

export default upload;