const RETRY_DELAY_MS = parseInt(process.env.SCRAPER_RETRY_DELAY_MS ?? '120000', 10);
const MAX_ATTEMPTS   = 3;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class ScraperQueue {
  constructor() {
    this._queue   = [];       // pending jobs
    this._history = [];       // completed (success + failed) jobs
    this._running = false;    // is the queue currently processing?

    this.onJobStart   = null; // (job) => void
    this.onJobSuccess = null; // (job, result) => void
    this.onJobFailure = null; // (job, error) => void
  }

  /**
   * Add a job to the queue.
   * @param {string}   name    - Human-readable job name (e.g. 'SBI_scrape')
   * @param {Function} execute - Async function that performs the work
   */
  add(name, execute) {
    const job = {
      id:         `${name}_${Date.now()}`,
      name,
      execute,
      status:     'pending',
      attempts:   0,
      result:     null,
      error:      null,
      startedAt:  null,
      finishedAt: null,
    };
    this._queue.push(job);
    console.log(`[Queue] Job added: ${name} (queue depth: ${this._queue.length})`);

    // Auto-start processing if not already running
    if (!this._running) {
      this._process();
    }

    return job.id;
  }

  /** Get all jobs currently pending in the queue */
  getPending() {
    return [...this._queue];
  }

  /** Get completed (success + failed) job history */
  getHistory(limit = 50) {
    return this._history.slice(-limit);
  }

  /** Get the status of a specific job by id */
  getJob(id) {
    return (
      this._queue.find(j => j.id === id) ||
      this._history.find(j => j.id === id) ||
      null
    );
  }

  /** Is the queue currently processing any job? */
  isProcessing() {
    return this._running;
  }

  // ── Internal ───────────────────────────────────────────

  async _process() {
    this._running = true;

    while (this._queue.length > 0) {
      const job = this._queue.shift();
      await this._executeWithRetry(job);
      this._history.push(job);
      // Keep history bounded
      if (this._history.length > 200) this._history.shift();
    }

    this._running = false;
    console.log('[Queue] All jobs processed. Queue is idle.');
  }

  async _executeWithRetry(job, attempt = 1) {
    job.attempts = attempt;
    job.status   = 'processing';
    job.startedAt = job.startedAt ?? new Date();

    console.log(`[Queue] -> ${job.name} (attempt ${attempt}/${MAX_ATTEMPTS})`);

    if (this.onJobStart && attempt === 1) {
      try { await this.onJobStart(job); } catch (_) {}
    }

    try {
      const result = await job.execute();
      job.status      = 'success';
      job.result      = result;
      job.finishedAt  = new Date();
      console.log(`[Queue] ${job.name} succeeded on attempt ${attempt}`);

      if (this.onJobSuccess) {
        try { await this.onJobSuccess(job, result); } catch (_) {}
      }
    } catch (err) {
      console.error(`[Queue] ${job.name} failed (attempt ${attempt}): ${err.message}`);

      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 2min, 4min, 8min
        console.log(`[Queue] Retrying ${job.name} in ${(delay / 60000).toFixed(1)} min...`);
        await sleep(delay);
        return this._executeWithRetry(job, attempt + 1);
      }

      // All attempts exhausted
      job.status     = 'failed';
      job.error      = err.message;
      job.finishedAt = new Date();

      if (this.onJobFailure) {
        try { await this.onJobFailure(job, err); } catch (_) {}
      }
    }
  }
}

// Singleton — one queue for the whole process lifetime
export const scraperQueue = new ScraperQueue();
