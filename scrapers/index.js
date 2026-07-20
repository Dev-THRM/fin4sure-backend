import bankbazaar from './adapters/bankbazaar.scraper.js';

// ─── PRIMARY SOURCE ───────────────────────────────────────
export const scrapers = [
  bankbazaar,
  // Add per-bank adapters here ONLY for banks not on BankBazaar
];

/**
 * Get a scraper by lenderShort.
 * For multi-bank adapters (isMultiBank=true), returns them for any short.
 * @param {string} short
 */
export const getScraperByShort = (short) => {
  // Check direct match first (per-bank adapters)
  const direct = scrapers.find(
    s => !s.isMultiBank && s.lenderShort?.toUpperCase() === short.toUpperCase()
  );
  if (direct) return direct;

  // Fall back to multi-bank adapter (BankBazaar covers all)
  return scrapers.find(s => s.isMultiBank) ?? null;
};
