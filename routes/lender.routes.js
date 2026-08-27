import express from 'express';
import { getLenders, getPublicLenderRates } from '../controllers/lender.controller.js';

const router = express.Router();

router.get('/', getLenders);
router.get('/rates', getPublicLenderRates);

export default router;
