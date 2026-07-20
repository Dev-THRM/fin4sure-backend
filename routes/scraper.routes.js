import express from 'express';
import { verifyUser, isAdmin } from '../middlewares/auth.middleware.js';
import {
  triggerFullScrapeHandler,
  triggerSingleScrapeHandler,
  getScraperStatusHandler,
  manualRateOverrideHandler,
} from '../controllers/scraper.controller.js';

const router = express.Router();

// All routes require authentication + admin role
router.use(verifyUser, isAdmin);

router.post('/trigger', triggerFullScrapeHandler);

router.post('/trigger/:short', triggerSingleScrapeHandler);

router.get('/status', getScraperStatusHandler);

router.post('/manual-rate', manualRateOverrideHandler);

export default router;
