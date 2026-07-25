import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';

export const getLenders = async (req, res) => {
  try {
    const lenders = await Lender.findAll({ raw: true });
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

    const enrichedLenders = lenders.map(l => ({
      ...l,
      loanRates: ratesByLender.get(l.id) || []
    }));

    return res.status(200).json({ success: true, data: enrichedLenders });
  } catch (error) {
    console.error('Error fetching lenders:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
