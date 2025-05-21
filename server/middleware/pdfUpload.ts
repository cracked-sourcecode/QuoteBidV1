import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Directory to store uploaded agreement PDFs
const agreementsDir = path.join(process.cwd(), 'uploads', 'agreements');
if (!fs.existsSync(agreementsDir)) {
  fs.mkdirSync(agreementsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, agreementsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const pdfUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export default pdfUpload;
