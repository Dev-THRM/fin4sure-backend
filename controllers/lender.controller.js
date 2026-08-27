import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';
import { ALL_LENDERS_DATA, syncAllLendersToDB } from '../services/lenderSeed.service.js';

export const getLenders = async (req, res) => {
  try {
    let lenders = await Lender.findAll({ raw: true });
    
    // Auto-sync master lenders if missing from database
    if (lenders.length < ALL_LENDERS_DATA.length) {
      try {
        await syncAllLendersToDB();
        lenders = await Lender.findAll({ raw: true });
      } catch (_) {}
    }

    const rates = await Lender_Loan_Rates.findAll({ raw: true });
    const loanTypes = await Loan_type.findAll({ raw: true });

    const typeMap = new Map(loanTypes.map(lt => [lt.id, lt]));

    const ratesByLender = new Map();
    rates.forEach(r => {
      const lt = typeMap.get(r.loan_type_id) || {};
      const enrichedRate = {
        ...r,
        type: lt
      };
      if (!ratesByLender.has(r.lender_id)) {
        ratesByLender.set(r.lender_id, []);
      }
      ratesByLender.get(r.lender_id).push(enrichedRate);
    });

    const dbLenderMap = new Map();
    lenders.forEach(l => {
      if (l.name) dbLenderMap.set(l.name.toLowerCase().trim(), l);
      if (l.short) dbLenderMap.set(l.short.toLowerCase().trim(), l);
    });

    // Merge with ALL_LENDERS_DATA to guarantee all institutions are returned
    const completeLenders = ALL_LENDERS_DATA.map((bank, idx) => {
      const dbL = dbLenderMap.get(bank.name.toLowerCase().trim()) || (bank.short ? dbLenderMap.get(bank.short.toLowerCase().trim()) : null);
      const lenderId = dbL ? dbL.id : (idx + 1);
      const dbRates = dbL ? (ratesByLender.get(dbL.id) || []) : [];

      return {
        id: lenderId,
        name: bank.name,
        short: bank.short || bank.name,
        type: bank.type || dbL?.type || 'private',
        category: bank.category || dbL?.category || 'bank',
        emoji: bank.emoji || '🏦',
        logo: bank.logo || dbL?.logo || null,
        offer: dbL?.offer || bank.offer || 'Competitive interest rates',
        loanRates: dbRates
      };
    });

    return res.status(200).json({ success: true, data: completeLenders });
  } catch (error) {
    console.error('Error fetching lenders:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
