import Lender from '../models/lender.js';

export const getLenders = async (req, res) => {
  try {
    const lenders = await Lender.findAll();
    res.status(200).json({ success: true, data: lenders });
  } catch (error) {
    console.error('Error fetching lenders:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
