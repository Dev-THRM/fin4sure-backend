import LoanType from '../models/loan_type.js';

export const getLoanTypes = async (req, res) => {
  try {
    const loanTypes = await LoanType.findAll();
    res.status(200).json({ success: true, data: loanTypes });
  } catch (error) {
    console.error('Error fetching loan types:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
