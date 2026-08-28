import express from "express";
import multer from "multer";
import path from "path";
import {
  applyProduct,
  getClientProducts,
  getMyApplications,
  uploadDocs,
  getApplicationDocuments
} from "../controllers/client.controller.js";
import { applyLoan, getMyLeads } from "../controllers/lead.controller.js";
import { verifyUser, isClient, isClientOrBroker } from "../middlewares/auth.middleware.js";

const router = express.Router();
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getUploadsDir } from '../utils/uploadHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = getUploadsDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const uploadMiddleware = (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File size is too large. Each file must be under 5 MB." });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || "Failed to process uploaded files" });
    }
    next();
  });
};

// Products applied
router.get("/products", verifyUser, isClient, getClientProducts);
router.post("/apply-product", verifyUser, isClient, applyProduct);

// Loan routes
router.post("/apply-loan", verifyUser, isClient, applyLoan);
router.get("/my-leads", verifyUser, isClient, getMyLeads);
router.get("/my-applications", verifyUser, isClient, getMyApplications);
router.get("/application-documents/:id", verifyUser, isClientOrBroker, getApplicationDocuments);
router.post("/upload-docs/:id", verifyUser, isClientOrBroker, uploadMiddleware, uploadDocs);

export default router;
