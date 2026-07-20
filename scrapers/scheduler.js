import cron from 'node-cron';
import { triggerFullScrape } from './orchestrator.js';

export const startScraperScheduler = () => {
  console.log('[Scheduler] Initializing cron jobs...');

  cron.schedule('0 3 * * *', () => {
    console.log('[Scheduler] ⏰ Triggering scheduled daily full scrape at 3 AM...');
    try {
      triggerFullScrape('cron');
    } catch (err) {
      console.error('[Scheduler] Error triggering scrape:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // Set to IST timezone as it's an Indian app
  });

  console.log('[Scheduler] ✅ Scraper scheduled for 03:00 AM IST daily');
};
