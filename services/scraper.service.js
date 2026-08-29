import { Op } from 'sequelize';
import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';
import { getCanonicalLender } from './lenderSeed.service.js';

export const getLenderByShort = async (shortOrName) => {
  if (!shortOrName) return null;
  const canonical = getCanonicalLender(shortOrName);
  const targetName = canonical ? canonical.name : shortOrName;
  const targetShort = canonical ? canonical.short : shortOrName;

  return Lender.findOne({
    where: {
      [Op.or]: [
        { name: targetName },
        { short: targetShort },
        { name: shortOrName },
        { short: shortOrName }
      ]
    }
  });
};

export const getLoanTypeByShortId = async (shortId) => {
  return Loan_type.findOne({ where: { short_id: shortId } });
};

/**
 * Upsert (update-or-insert) a single lender rate row.
 *
 * @param {number} lenderId
 * @param {number} loanTypeId
 * @param {object} rateData - { rateType, minRate, maxRate, effectiveFrom }
 * @returns {{ created: boolean, record: object }}
 */
export const upsertLenderRate = async (lenderId, loanTypeId, rateData) => {
  const { rateType, minRate, maxRate, effectiveFrom } = rateData;

  const [record, created] = await Lender_Loan_Rates.findOrCreate({
    where: {
      lender_id: lenderId,
      loan_type_id: loanTypeId,
      rate_type: rateType,
    },
    defaults: {
      min_rate: minRate,
      max_rate: maxRate,
      effective_from: effectiveFrom ?? new Date(),
    },
  });

  if (!created) {
    await record.update({
      min_rate: minRate,
      max_rate: maxRate,
      effective_from: effectiveFrom ?? new Date(),
    });
  }

  return { created, record };
};


const getBankType = (short) => {
  const psu = ['SBI', 'PNB', 'UBI', 'BOB', 'CANARA', 'BOM', 'BOI', 'INDIAN'];
  const nbfc = ['ABFL', 'BAJAJ', 'TATA', 'LICHF'];
  if (psu.includes(short)) return 'PSU';
  if (nbfc.includes(short)) return 'NBFC';
  return 'Private';
};

/**
 * Process all scraped rates for a single lender.
 *
 * @param {string} lenderShort - e.g. 'SBI'
 * @param {Array}  rates       - array of { loanTypeShortId, rateType, minRate, maxRate, ... }
 * @returns {{ upsertedCount: number, errors: string[] }}
 */
export const processScrapeResults = async (lenderShort, rates) => {
  let lender = await getLenderByShort(lenderShort);
  if (!lender) {
    const canonical = getCanonicalLender(lenderShort);
    const finalName = canonical ? canonical.name : lenderShort;
    const finalShort = canonical ? canonical.short : lenderShort;
    const finalType = canonical ? canonical.type : getBankType(lenderShort);

    console.log(`[Scraper Service] Creating canonical lender: ${finalName} (${finalShort})`);
    const [lRecord] = await Lender.findOrCreate({
      where: { name: finalName },
      defaults: {
        name: finalName,
        short: finalShort,
        type: finalType,
        offer: canonical?.offer || ''
      }
    });
    lender = lRecord;
  }

  let upsertedCount = 0;
  const errors = [];

  for (const rate of rates) {
    try {
      const loanType = await getLoanTypeByShortId(rate.loanTypeShortId);
      if (!loanType) {
        errors.push(`Unknown loan type: ${rate.loanTypeShortId}`);
        continue;
      }
      await upsertLenderRate(lender.id, loanType.id, rate);
      upsertedCount++;
    } catch (err) {
      errors.push(`Failed to upsert ${rate.loanTypeShortId}/${rate.rateType}: ${err.message}`);
    }
  }

  return { upsertedCount, errors };
};

/**
 * Manually set a lender rate — used by admin when scraping fails.
 *
 * @param {object} payload - { lender_id, loan_type_id, rate_type, min_rate, max_rate, ... }
 */
export const manualOverrideRate = async (payload) => {
  const {
    lender_id,
    loan_type_id,
    rate_type,
    min_rate,
    max_rate,
    effective_from,
  } = payload;

  const [record, created] = await Lender_Loan_Rates.findOrCreate({
    where: { lender_id, loan_type_id, rate_type },
    defaults: {
      min_rate,
      max_rate,
      effective_from: effective_from ?? new Date(),
    },
  });

  if (!created) {
    await record.update({ min_rate, max_rate, effective_from: effective_from ?? new Date() });
  }

  return { created, record };
};


