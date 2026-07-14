import express from 'express';
import { getLoanTypes } from '../controllers/loanType.controller.js';

const router = express.Router();

router.get('/', getLoanTypes);

export default router;
