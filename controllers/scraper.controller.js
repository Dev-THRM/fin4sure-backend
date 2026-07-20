/**
 *  POST /api/admin/scraper/trigger          — Trigger full scrape (all banks)
 *  POST /api/admin/scraper/trigger/:short   — Trigger scrape for one bank
 *  GET  /api/admin/scraper/status           — Queue status + history
 *  GET  /api/admin/scraper/logs             — DB run logs
 *  POST /api/admin/scraper/manual-rate      — Submit a rate manually (fallback)
 */

import { triggerFullScrape, triggerSingleScrape, getQueueStatus } from '../scrapers/orchestrator.js';
import { manualOverrideRate } from '../services/scraper.service.js';
import { scrapers } from '../scrapers/index.js';

export const triggerFullScrapeHandler = async (req, res) => {
  try {
    triggerFullScrape('manual_admin');
    res.status(202).json({
      success: true,
      message: `Scrape jobs enqueued for ${scrapers.length} lenders.`,
      lenders: scrapers.map(s => s.lenderShort),
    });
  } catch (err) {
    console.error('[Scraper Controller] triggerFull error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const triggerSingleScrapeHandler = async (req, res) => {
  try {
    const { short } = req.params;
    triggerSingleScrape(short.toUpperCase(), 'manual_admin');
    res.status(202).json({
      success: true,
      message: `Scrape job enqueued for ${short.toUpperCase()}.`,
    });
  } catch (err) {
    console.error('[Scraper Controller] triggerSingle error:', err.message);
    res.status(404).json({ success: false, message: err.message });
  }
};


export const getScraperStatusHandler = async (req, res) => {
  try {
    const status = getQueueStatus();
    res.status(200).json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const manualRateOverrideHandler = async (req, res) => {
  try {
    const {
      lender_id,
      loan_type_id,
      rate_type,
      min_rate,
      max_rate,
      effective_from,
    } = req.body;

    // Validation
    if (!lender_id || !loan_type_id || !rate_type || min_rate == null || max_rate == null) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: lender_id, loan_type_id, rate_type, min_rate, max_rate',
      });
    }

    if (!['floating', 'fixed'].includes(rate_type)) {
      return res.status(400).json({ success: false, message: 'rate_type must be "floating" or "fixed"' });
    }

    if (parseFloat(min_rate) > parseFloat(max_rate)) {
      return res.status(400).json({ success: false, message: 'min_rate cannot exceed max_rate' });
    }

    const { created, record } = await manualOverrideRate({
      lender_id,
      loan_type_id,
      rate_type,
      min_rate: parseFloat(min_rate),
      max_rate: parseFloat(max_rate),
      effective_from: effective_from ? new Date(effective_from) : new Date(),
    });

    res.status(200).json({
      success: true,
      action: created ? 'inserted' : 'updated',
      data: record,
    });
  } catch (err) {
    console.error('[Scraper Controller] manualOverride error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
