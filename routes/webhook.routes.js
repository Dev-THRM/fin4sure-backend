import express from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

// GET request is usually used by providers (like Meta/Facebook) to verify the webhook URL
router.get("/", verifyWebhook);

// POST request is used to receive the actual webhook payload events
router.post("/", receiveWebhook);

export default router;
