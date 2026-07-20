/**
 * Scraper One-Shot Test Runner
 * ─────────────────────────────────────────────────────────
 * Run this script directly to test scraping without starting
 * the full server, cron, or queue.
 *
 * Usage:
 *   node scrapers/test-run.js                   → test all lenders
 *   node scrapers/test-run.js --lender SBI      → test SBI only
 *   node scrapers/test-run.js --lender HDFC     → test HDFC only
 *   node scrapers/test-run.js --dry-run         → scrape but skip DB write
 *
 * Environment:
 *   Loads .env from project root (reads DB_* variables).
 *   Set SCRAPER_RETRY_DELAY_MS=5000 in .env for fast retry testing.
 */

import dotenv from 'dotenv';
dotenv.config();

import { scrapers, getScraperByShort } from './index.js';
import { processScrapeResults }         from '../services/scraper.service.js';

// ── CLI arg parsing ───────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const lenderArg = args.includes('--lender') ? args[args.indexOf('--lender') + 1]?.toUpperCase() : null;
const isDryRun  = args.includes('--dry-run');

// ── Select adapters ───────────────────────────────────────────────────────
const adaptersToRun = lenderArg
  ? [getScraperByShort(lenderArg)].filter(Boolean)
  : scrapers;

if (adaptersToRun.length === 0) {
  console.error(`❌ No adapter found for lender: "${lenderArg}"`);
  console.error(`   Available: ${scrapers.map(s => s.lenderShort).join(', ')}`);
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────
const run = async () => {
  console.log('═══════════════════════════════════════════════');
  console.log(' Fin4Sure — Scraper Test Run');
  console.log(`  Sources : ${adaptersToRun.map(a => a.displayName ?? a.lenderShort).join(', ')}`);
  console.log(`  Dry run : ${isDryRun ? 'YES (no DB writes)' : 'NO (will write to DB)'}`);
  console.log('═══════════════════════════════════════════════\n');

  for (const adapter of adaptersToRun) {
    console.log(`\n─── Testing: ${adapter.displayName} ───`);

    try {
      const raw = await adapter.scrape();

      // ── Multi-bank adapter (BankBazaar) ──────────────────
      if (adapter.isMultiBank) {
        const bankRateMap = raw; // { [lenderShort]: [rates] }
        const banks = Object.keys(bankRateMap);

        if (banks.length === 0) {
          console.warn(`⚠️  No banks scraped — BankBazaar page structure may have changed.`);
          continue;
        }

        console.log(`\n📊 Banks found: ${banks.join(', ')}\n`);

        for (const [lenderShort, rates] of Object.entries(bankRateMap)) {
          console.log(`  ${lenderShort} — ${rates.length} rate entries:`);
          console.table(
            rates.map(r => ({
              LoanType:  r.loanTypeShortId,
              RateType:  r.rateType,
              Min:       `${r.minRate}%`,
              Max:       `${r.maxRate}%`,
            }))
          );

          if (!isDryRun) {
            try {
              const { processScrapeResults } = await import('../services/scraper.service.js');
              const { upsertedCount, errors } = await processScrapeResults(lenderShort, rates);
              console.log(`  ✅ ${lenderShort}: ${upsertedCount} rate(s) written to DB`);
              if (errors.length > 0) errors.forEach(e => console.warn(`  ⚠️  ${e}`));
            } catch (err) {
              console.warn(`  ⚠️  ${lenderShort} DB write failed: ${err.message}`);
            }
          }
        }

        if (isDryRun) console.log(`\n[Dry Run] Skipping DB writes.`);
        continue;
      }

      // ── Per-bank adapter (fallback) ───────────────────────
      const rates = raw;
      if (rates.length === 0) {
        console.warn(`⚠️  ${adapter.lenderShort}: scraper returned 0 rates.`);
        console.warn('   → Check the URLs and CSS selectors in the adapter file.');
        continue;
      }

      console.log(`\n📊 Scraped ${rates.length} rate entries:`);
      console.table(
        rates.map(r => ({
          LoanType:   r.loanTypeShortId,
          RateType:   r.rateType,
          Min:        `${r.minRate}%`,
          Max:        `${r.maxRate}%`,
        }))
      );

      if (!isDryRun) {
        console.log(`\n💾 Writing to DB...`);
        const { processScrapeResults } = await import('../services/scraper.service.js');
        const { upsertedCount, errors } = await processScrapeResults(adapter.lenderShort, rates);
        console.log(`✅ Upserted ${upsertedCount} rate(s) for ${adapter.lenderShort}`);
        if (errors.length > 0) errors.forEach(e => console.warn('   •', e));
      } else {
        console.log(`\n[Dry Run] Skipping DB write.`);
      }
    } catch (err) {
      console.error(`❌ ${adapter.displayName ?? adapter.lenderShort} threw an error: ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(' Test run complete.');
  console.log('═══════════════════════════════════════════════');
  process.exit(0);
};

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
