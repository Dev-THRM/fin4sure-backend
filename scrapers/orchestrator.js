import { scrapers, getScraperByShort } from './index.js';
import { scraperQueue } from '../queues/scraperQueue.js';
import { processScrapeResults } from '../services/scraper.service.js';

export const triggerFullScrape = (triggeredBy = 'cron') => {
  console.log(`\n[Orchestrator] Triggering full scrape (${scrapers.length} source(s)) — by: ${triggeredBy}`);
  for (const adapter of scrapers) {
    _enqueueAdapter(adapter, triggeredBy);
  }
};

export const triggerSingleScrape = (lenderShort, triggeredBy = 'manual_admin') => {
  const adapter = getScraperByShort(lenderShort);
  if (!adapter) {
    throw new Error(`No scraper registered for lender: ${lenderShort}`);
  }
  console.log(`[Orchestrator] Single scrape: ${lenderShort} → using ${adapter.displayName}`);
  _enqueueAdapter(adapter, triggeredBy);
};


const _enqueueAdapter = (adapter, triggeredBy) => {
  const jobName = adapter.isMultiBank
    ? `bankbazaar_scrape`
    : `${adapter.lenderShort}_scrape`;

  scraperQueue.add(jobName, async () => {
    if (adapter.isMultiBank) {
      const bankRateMap = await adapter.scrape(); // { [lenderShort]: [rates] }

      if (!bankRateMap || Object.keys(bankRateMap).length === 0) {
        throw new Error('BankBazaar scraper returned 0 banks');
      }

      let totalUpserted = 0;
      const allErrors = [];

      for (const [lenderShort, rates] of Object.entries(bankRateMap)) {
        if (!rates || rates.length === 0) continue;
        try {
          const { upsertedCount, errors } = await processScrapeResults(lenderShort, rates);
          totalUpserted += upsertedCount;

          if (errors.length > 0) allErrors.push(...errors.map(e => `[${lenderShort}] ${e}`));
          console.log(`[Orchestrator] ${lenderShort}: ${upsertedCount} rate(s) upserted`);
        } catch (err) {
          // Lender might not be in DB — skip gracefully
          const msg = `${lenderShort}: ${err.message}`;
          allErrors.push(msg);
          console.warn(`[Orchestrator] ⚠️  ${msg}`);
        }
      }

      return { source: 'BankBazaar', totalUpserted, errors: allErrors };
    }

    // ── Per-bank adapter (legacy / non-BankBazaar banks) ──
    const rates = await adapter.scrape();

    if (!rates || rates.length === 0) {
      throw new Error('Scraper returned 0 rates');
    }

    const { upsertedCount, errors } = await processScrapeResults(adapter.lenderShort, rates);

    return { lenderShort: adapter.lenderShort, upsertedCount, errors };
  });
};

export const getQueueStatus = () => ({
  isProcessing:  scraperQueue.isProcessing(),
  pending:       scraperQueue.getPending().map(j => ({ id: j.id, name: j.name, status: j.status })),
  recentHistory: scraperQueue.getHistory(20).map(j => ({
    id:         j.id,
    name:       j.name,
    status:     j.status,
    attempts:   j.attempts,
    error:      j.error,
    startedAt:  j.startedAt,
    finishedAt: j.finishedAt,
  })),
});
