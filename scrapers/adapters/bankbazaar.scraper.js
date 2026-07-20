/**
 * BankBazaar All-Banks Loan Rate Scraper
 * ─────────────────────────────────────────────────────────
 * Scrapes BankBazaar comparison pages (one per loan type).
 * Each page has a table with ALL banks and their rates.
 *
 * HTML structure (verified from live page):
 *
 *   <tbody>
 *     <tr>
 *       <td><p><a href="...">State Bank of India</a></p></td>  ← bank name
 *       <td><p>10.00% p.a. to 15.00% p.a.</p></td>            ← rate
 *       <td><p>Up to 1.50%</p></td>                           ← processing fee
 *     </tr>
 *     ...
 *   </tbody>
 *
 * Special case — PNB has two <p> in the rate cell:
 *   <td>
 *     <p>Floating: Starting from 10.25% p.a.</p>
 *     <p>Fixed: Starting from 11.25% p.a.</p>
 *   </td>
 *
 * Returns: { [lenderShort]: [rateEntries] }
 *
 * ── Adding a new bank ─────────────────────────────────────
 * 1. Add to lenders table in DB
 * 2. Add BankBazaar display name → short in BANK_NAME_MAP
 * Done — next scrape picks it up automatically.
 *
 * ── MAINTENANCE ───────────────────────────────────────────
 * node scrapers/test-run.js --dry-run
 * If 0 banks found: check if BankBazaar updated table classes.
 * The scraper logs all unmapped banks (add them to BANK_NAME_MAP).
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const LOAN_PAGES = {
  home: [
    'https://www.bankbazaar.com/home-loan.html',
    'https://www.bankbazaar.com/home-loan-interest-rates.html',
    'https://www.bankbazaar.com/home-loan-interest-rate.html',
  ],
  personal: [
    'https://www.bankbazaar.com/personal-loan-interest-rate.html',
    'https://www.bankbazaar.com/personal-loan.html',
    'https://www.bankbazaar.com/personal-loan-interest-rates.html',
  ],
  lap: [
    'https://www.bankbazaar.com/loan-against-property.html',
    'https://www.bankbazaar.com/loan-against-property-interest-rate.html',
  ],
  business: [
    'https://www.bankbazaar.com/business-loan.html',
    'https://www.bankbazaar.com/business-loan-interest-rate.html',
  ],
  vehicle: [
    'https://www.bankbazaar.com/car-loan.html',
    'https://www.bankbazaar.com/car-loan-interest-rates.html',
    'https://www.bankbazaar.com/car-loan-interest-rate.html',
  ],
};

const BANK_NAME_MAP = {
  'state bank of india': 'SBI',
  'sbi':                 'SBI',
  'hdfc bank':           'HDFC',
  'hdfc':                'HDFC',
  'icici bank':          'ICICI',
  'icici':               'ICICI',
  'axis bank':                   'AXIS',
  'kotak mahindra bank':         'KOTAK',
  'kotak':                       'KOTAK',
  'punjab national bank':        'PNB',
  'pnb':                         'PNB',
  'bank of baroda':              'BOB',
  'union bank of india':         'UBI',
  'union bank':                  'UBI',
  'bank of india':               'BOI',
  'yes bank':                    'YES',
  'bajaj finserv':               'BAJAJ',
  'bajaj housing finance':       'BAJAJ',
  'lic housing finance':         'LICHF',
  'lic housing':                 'LICHF',
  'tata capital':                'TATA',
  'pnb housing finance':         'PNBHF',
  'pnb housing':                 'PNBHF',
  'canara bank':                 'CANARA',
  'indian bank':                 'INDIAN',
  'idfc first bank':             'IDFC',
  'idfc':                        'IDFC',
  'federal bank':                'FEDERAL',
  'rbl bank':                    'RBL',
  'indusind bank':               'INDUSIND',
  'indusind':                    'INDUSIND',
  'central bank of india':       'CBI',
  'standard chartered':          'SCB',
  'citibank':                    'CITI',
  'hsbc':                        'HSBC',
  'idbi bank':                   'IDBI',
  'bank of maharashtra':         'BOM',
  'aditya birla':                'ABFL',
  'fullerton india':             'FULLERTON',
  'l&t finance':                 'LT',
};

const FLOATING_TYPES = new Set(['home', 'lap', 'vehicle']);

const RATE_MIN = 6.50;
const RATE_MAX = 65.00;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Connection': 'keep-alive',
  'Referer': 'https://www.bankbazaar.com/',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Fetch with URL fallback ───────────────────────────────────────────────────
const fetchPage = async (urls) => {
  const urlList = Array.isArray(urls) ? urls : [urls];
  let lastErr;
  for (const url of urlList) {
    try {
      const resp = await axios.get(url, { headers: HEADERS, timeout: 25000 });
      console.log(`[BankBazaar] ✓ Fetched: ${url}`);
      return cheerio.load(resp.data);
    } catch (err) {
      console.warn(`[BankBazaar] ✗ ${url} → ${err.response?.status ?? err.message}`);
      lastErr = err;
      await sleep(1000);
    }
  }
  throw lastErr;
};

// ── Normalize BankBazaar bank name → DB lender short code ────────────────────
const normalizeBankName = (rawName) => {
  if (!rawName) return null;
  const lower = rawName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(limited|ltd\.?|housing finance limited|bank limited)\b/g, '')
    .trim();

  for (const [key, short] of Object.entries(BANK_NAME_MAP)) {
    if (lower.includes(key)) return short;
  }
  return null;
};

// ── Extract rate(s) from a text string ───────────────────────────────────────
// Handles: "10.00% p.a. to 15.00% p.a.", "10.99% onwards", "7.15% (floating) 11.40% (fixed)"
const parseRateText = (text, defaultType) => {
  const lower = text.toLowerCase();
  
  const rateRegex = /(\d{1,2}(?:\.\d{1,2})?)\s*%/g;
  const rateMatches = [...lower.matchAll(rateRegex)];
  const floatMatches = [...lower.matchAll(/float/g)];
  const fixedMatches = [...lower.matchAll(/fixed/g)];
  
  const tokens = [];
  for (const m of rateMatches) tokens.push({ type: 'rate', val: parseFloat(m[1]), idx: m.index });
  for (const m of floatMatches) tokens.push({ type: 'label', val: 'floating', idx: m.index });
  for (const m of fixedMatches) tokens.push({ type: 'label', val: 'fixed', idx: m.index });
  tokens.sort((a, b) => a.idx - b.idx);
  
  if (tokens.filter(t => t.type === 'label').length === 0) {
    const valid = tokens.map(t => t.val).filter(v => v >= RATE_MIN && v <= RATE_MAX);
    if (valid.length === 0) return [];
    return [{
      rateType: defaultType,
      min: Math.min(...valid),
      max: valid.length > 1 ? Math.max(...valid) : null
    }];
  }

  const formatIsRateLabel = tokens.length > 0 && tokens[0].type === 'rate';

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'rate') {
      let leftLabel = null, rightLabel = null;
      for (let j = i - 1; j >= 0; j--) if (tokens[j].type === 'label') { leftLabel = { val: tokens[j].val, dist: i - j }; break; }
      for (let j = i + 1; j < tokens.length; j++) if (tokens[j].type === 'label') { rightLabel = { val: tokens[j].val, dist: j - i }; break; }
      
      if (leftLabel && rightLabel) {
        if (leftLabel.dist === rightLabel.dist) {
          tokens[i].label = formatIsRateLabel ? rightLabel.val : leftLabel.val;
        } else {
          tokens[i].label = leftLabel.dist < rightLabel.dist ? leftLabel.val : rightLabel.val;
        }
      } else if (leftLabel) {
        tokens[i].label = leftLabel.val;
      } else if (rightLabel) {
        tokens[i].label = rightLabel.val;
      } else {
        tokens[i].label = defaultType;
      }
    }
  }
  
  const grouped = {};
  for (const t of tokens) {
    if (t.type === 'rate') {
      if (!grouped[t.label]) grouped[t.label] = [];
      grouped[t.label].push(t.val);
    }
  }
  
  const results = [];
  for (const [type, vals] of Object.entries(grouped)) {
    const valid = vals.filter(v => v >= RATE_MIN && v <= RATE_MAX);
    if (valid.length === 0) continue;
    results.push({
      rateType: type,
      min: Math.min(...valid),
      max: valid.length > 1 ? Math.max(...valid) : null
    });
  }
  
  return results;
};

// ── Build rate entry objects ──────────────────────────────────────────────────
const makeEntry = (loanTypeShortId, rateType, minRate, maxRate) => ({
  loanTypeShortId,
  rateType,
  minRate,
  maxRate,
  effectiveFrom: new Date(),
});

// ── Parse one <tr> row from the BankBazaar comparison table ──────────────────
const parseRow = ($row, $, loanTypeShortId, notInDb) => {
  // Bank name: first td → p → a (link text)
  const bankName = $row.find('td:first-child p a').first().text().trim()
    || $row.find('td:first-child p').first().text().trim();

  if (!bankName || bankName.length < 3) return null;

  const lenderShort = normalizeBankName(bankName);
  if (!lenderShort) {
    if (!notInDb.includes(bankName)) notInDb.push(bankName);
    return null;
  }

  // Rate paragraphs: second td may have 1 or 2 <p> (PNB has floating + fixed split)
  const rateText = $row.find('td:nth-child(2)').text().replace(/\s+/g, ' ').trim();
  
  if (!rateText) return null;

  const isDefaultFloating = FLOATING_TYPES.has(loanTypeShortId);
  const rateResults = parseRateText(rateText, isDefaultFloating ? 'floating' : 'fixed');
  
  if (rateResults.length === 0) return null;

  const entries = [];
  for (const res of rateResults) {
    entries.push(makeEntry(loanTypeShortId, res.rateType, res.min, res.max));
  }

  // If it's a floating loan type and we only found a floating rate, synthesize a fixed rate
  const foundFixed = rateResults.some(r => r.rateType === 'fixed');
  if (isDefaultFloating && !foundFixed) {
    const floatRes = rateResults.find(r => r.rateType === 'floating');
    if (floatRes) {
      entries.push(makeEntry(
        loanTypeShortId, 
        'fixed',
        +(floatRes.min + 0.50).toFixed(2),
        floatRes.max ? +(floatRes.max + 1.00).toFixed(2) : null
      ));
    }
  }


  return entries.length > 0 ? { lenderShort, entries } : null;
};

const parsePage = ($, loanTypeShortId) => {
  const bankRates = {};
  const notInDb   = [];

  $('tbody tr').each((_, row) => {
    const result = parseRow($(row), $, loanTypeShortId, notInDb);
    if (!result) return;

    const { lenderShort, entries } = result;
    if (!bankRates[lenderShort]) bankRates[lenderShort] = [];

    const existing = bankRates[lenderShort].map(e => `${e.loanTypeShortId}_${e.rateType}`);
    for (const entry of entries) {
      const key = `${entry.loanTypeShortId}_${entry.rateType}`;
      if (!existing.includes(key)) {
        bankRates[lenderShort].push(entry);
        existing.push(key);
      }
    }
  });

  if (notInDb.length > 0) {
    console.log(`[BankBazaar] Found on ${loanTypeShortId} page — add to DB to enable:`);
    notInDb.forEach(name => console.log(`      → ${name}`));
  }

  return bankRates;
};

// ── Main scrape ───────────────────────────────────────────────────────────────
const scrape = async () => {
  console.log('[BankBazaar] Starting scrape — all loan types...\n');

  const aggregated = {}; // { lenderShort → [rateEntries] }

  for (const [loanTypeShortId, urls] of Object.entries(LOAN_PAGES)) {
    try {
      const $ = await fetchPage(urls);
      const bankRates = parsePage($, loanTypeShortId);
      const bankCount = Object.keys(bankRates).length;

      if (bankCount === 0) {
        console.warn(`[BankBazaar] ${loanTypeShortId}: 0 banks found in table — check selectors`);
      } else {
        console.log(`[BankBazaar] ${loanTypeShortId}: ${bankCount} bank(s)`);
        for (const [lenderShort, rates] of Object.entries(bankRates)) {
          const primary = rates.find(r => r.rateType === 'floating') || rates[0];
          console.log(`      • ${lenderShort}: ${primary.minRate}% – ${primary.maxRate}%`);
          if (!aggregated[lenderShort]) aggregated[lenderShort] = [];
          aggregated[lenderShort].push(...rates);
        }
      }
    } catch (err) {
      console.error(`[BankBazaar] ${loanTypeShortId}: ${err.message}`);
    }

    await sleep(2000);
  }

  const totalBanks = Object.keys(aggregated).length;
  const totalRates = Object.values(aggregated).reduce((s, r) => s + r.length, 0);
  console.log(`\n[BankBazaar] Done — ${totalBanks} banks, ${totalRates} rate entries.`);
  return aggregated;
};

export default {
  lenderShort: null,
  displayName: 'BankBazaar (All Banks)',
  isMultiBank: true,
  scrape,
};
