import cron from "node-cron";
import { runDirectBankScraper } from "./bankScraper.service.js";

let activeCronTask = null;
let currentDayOfWeek = "Monday"; // Default day of weekly run
let lastRunTime = null;
let lastStatus = "Idle - Waiting for next scheduled run";
let isRunning = false;

const DAY_MAP = {
  "Sunday": 0,
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Saturday": 6
};

/**
 * Initializes weekly cron scraper at 02:00 AM on selected day.
 */
export function startScraperCron(day = "Monday") {
  currentDayOfWeek = day;
  const dayIndex = DAY_MAP[day] !== undefined ? DAY_MAP[day] : 1;

  if (activeCronTask) {
    activeCronTask.stop();
  }

  // Cron format: Minute Hour DayOfMonth Month DayOfWeek
  // Runs every week on the configured day at 02:00 AM
  const cronExpression = `0 2 * * ${dayIndex}`;

  activeCronTask = cron.schedule(cronExpression, async () => {
    console.log(`[ScraperScheduler] Executing scheduled weekly bank rate scrape on ${currentDayOfWeek}...`);
    await executeScraperJob();
  });

  console.log(`[ScraperScheduler] Weekly scraper scheduled for every ${day} at 02:00 AM (${cronExpression}).`);
}

/**
 * Executes direct bank scraper job and records status.
 */
export async function executeScraperJob() {
  if (isRunning) {
    return { success: false, message: "Scraper is already running" };
  }

  isRunning = true;
  lastStatus = "In Progress: Scraping official bank rate tables...";
  try {
    const result = await runDirectBankScraper();
    lastRunTime = new Date().toISOString();
    lastStatus = `Success: Updated ${result.summary.totalBanks} institutions at ${new Date().toLocaleTimeString()}`;
    return result;
  } catch (err) {
    console.error("[ScraperScheduler] Error running scraper:", err);
    lastStatus = `Error: ${err.message}`;
    return { success: false, message: err.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Updates schedule to a different day of the week.
 */
export function updateScraperDay(day) {
  if (DAY_MAP[day] === undefined) {
    throw new Error(`Invalid day: ${day}. Must be one of Sunday-Saturday.`);
  }
  startScraperCron(day);
  return getScraperState();
}

/**
 * Returns current status of the scraper and scheduler.
 */
export function getScraperState() {
  return {
    dayOfWeek: currentDayOfWeek,
    cronTime: "02:00 AM Weekly",
    lastRunTime,
    lastStatus,
    isRunning
  };
}
