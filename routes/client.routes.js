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

// -------------------- Client routes --------------------

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Products applied
router.get("/products", verifyUser, isClient, getClientProducts);
router.post("/apply-product", verifyUser, isClient, applyProduct);

// Loan routes
router.post("/apply-loan", verifyUser, isClient, applyLoan);
router.get("/my-leads", verifyUser, isClient, getMyLeads);
router.get("/my-applications", verifyUser, isClient, getMyApplications);
router.get("/application-documents/:id", verifyUser, isClientOrBroker, getApplicationDocuments);
router.post("/upload-docs/:id", verifyUser, isClientOrBroker, upload.array('files'), uploadDocs);

export default router;
