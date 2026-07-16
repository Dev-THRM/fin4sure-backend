import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';

export const getLenders = async (req, res) => {
  try {
    const lenders = await Lender.findAll({
      include: [{
        model: Lender_Loan_Rates,
        as: 'loanRates',
        include: [{
          model: Loan_type,
          as: 'type',
          attributes: ['id', 'name', 'short_id', 'icon', 'description']
        }]
      }]
    });
    res.status(200).json({ success: true, data: lenders });
  } catch (error) {
    console.error('Error fetching lenders:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
