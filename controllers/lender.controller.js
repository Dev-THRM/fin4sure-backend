import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';

export const getLenders = async (req, res) => {
  try {
    const lenders = await Lender.findAll({ order: [['id', 'ASC']], raw: true });
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

    const completeLenders = lenders.map(l => {
      const dbRates = ratesByLender.get(l.id) || [];
      return {
        id: l.id,
        name: l.name,
        short: l.short || l.name,
        type: l.type ? (l.type.toUpperCase() === 'PSU' ? 'PSU' : l.type.toLowerCase().includes('nbfc') ? 'NBFC/HFC' : l.type.toLowerCase().includes('small') ? 'SFB' : 'Private') : 'Private',
        emoji: '🏦',
        logo: null,
        offer: l.offer || 'Competitive interest rates',
        loanRates: dbRates
      };
    });

    return res.status(200).json({ success: true, data: completeLenders });
  } catch (error) {
    console.error('Error fetching lenders:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const getPublicLenderRates = async (req, res) => {
  try {
    const { loanTypeShortId = 'HL' } = req.query;
    const { getLenderRatesHelper } = await import('./admin.controller.js');
    const rates = await getLenderRatesHelper(loanTypeShortId);
    return res.status(200).json({ success: true, data: rates });
  } catch (error) {
    console.error('Error in getPublicLenderRates:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
