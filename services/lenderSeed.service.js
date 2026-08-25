import Lender from '../models/lender.js';
import Lender_Loan_Rates from '../models/lender_loan_rates.js';
import Loan_type from '../models/loan_type.js';

export const ALL_LENDERS_DATA = [
  // 1. Core PSU & Top Private Giants (Exact order from user reference)
  {
    name: 'SBI', short: 'SBI', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.10, 9.65], x: [8.70, 11.20] },
      lap: { f: [8.55, 11.05], x: [9.55, 12.05] },
      personal: { f: [10.50, 14.50], x: [11.50, 15.50] },
      business: { f: [11.25, 16.00], x: [12.50, 17.25] },
      vehicle: { f: [8.75, 11.00], x: [9.50, 12.00] }
    },
    offer: 'Zero PF on home'
  },
  {
    name: 'HDFC Bank', short: 'HDFC', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.20, 9.80], x: [8.80, 11.50] },
      lap: { f: [9.00, 13.00], x: [10.00, 14.00] },
      personal: { f: [10.75, 15.00], x: [11.75, 16.00] },
      business: { f: [11.50, 16.50], x: [12.75, 17.75] },
      vehicle: { f: [8.85, 11.25], x: [9.65, 12.25] }
    },
    offer: 'Pre-approved off'
  },
  {
    name: 'ICICI Bank', short: 'ICICI', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.25, 9.90], x: [8.90, 11.60] },
      lap: { f: [9.00, 13.50], x: [10.00, 14.50] },
      personal: { f: [10.65, 14.75], x: [11.65, 15.75] },
      business: { f: [11.40, 16.25], x: [12.60, 17.50] },
      vehicle: { f: [8.80, 11.15], x: [9.60, 12.15] }
    },
    offer: 'Instant in-princip'
  },
  {
    name: 'Axis Bank', short: 'Axis', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.30, 10.00], x: [9.00, 11.70] },
      lap: { f: [8.90, 11.00], x: [10.90, 12.00] },
      personal: { f: [10.99, 15.50], x: [12.00, 16.50] },
      business: { f: [11.75, 17.00], x: [13.00, 18.25] },
      vehicle: { f: [8.99, 11.50], x: [9.85, 12.50] }
    },
    offer: 'Offer text'
  },
  {
    name: 'Kotak Mahindra', short: 'Kotak', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.40, 9.75], x: [9.00, 11.50] },
      lap: { f: [9.50, 12.50], x: [10.50, 13.50] },
      personal: { f: [10.90, 15.25], x: [11.90, 16.25] },
      business: { f: [11.90, 17.25], x: [13.15, 18.50] },
      vehicle: { f: [9.10, 11.75], x: [9.95, 12.75] }
    },
    offer: 'Offer text'
  },
  {
    name: 'Bajaj Finserv', short: 'Bajaj', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [7.25, 10.50], x: [9.00, 12.00] },
      lap: { f: [9.00, 14.00], x: [10.00, 15.00] },
      personal: { f: [11.50, 16.50], x: [12.50, 18.00] },
      business: { f: [12.50, 18.50], x: [13.75, 19.75] },
      vehicle: { f: [9.25, 12.50], x: [10.25, 13.50] }
    },
    offer: 'Pre-approved pei'
  },
  {
    name: 'PNB Housing', short: 'PNBHFL', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [7.50, 13.45], x: [9.00, 14.00] },
      lap: { f: [8.50, 12.50], x: [9.50, 13.50] },
      personal: { f: [11.75, 16.00], x: [12.75, 17.50] },
      business: { f: [12.75, 18.00], x: [14.00, 19.50] },
      vehicle: { f: [9.50, 12.75], x: [10.50, 13.75] }
    },
    offer: 'Offer text'
  },
  {
    name: 'LIC Housing', short: 'LICHFL', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [7.50, 10.35], x: [9.50, 12.00] },
      lap: { f: [9.50, 12.50], x: [10.50, 13.50] },
      personal: { f: [11.25, 15.50], x: [12.25, 16.75] },
      business: { f: [12.00, 17.50], x: [13.25, 18.75] },
      vehicle: { f: [9.00, 11.80], x: [9.90, 12.80] }
    },
    offer: 'Griha Lakshmi Sp'
  },
  {
    name: 'Tata Capital', short: 'Tata', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [8.50, 11.00], x: [9.50, 12.00] },
      lap: { f: [9.00, 13.50], x: [10.00, 14.50] },
      personal: { f: [11.99, 17.00], x: [13.00, 18.50] },
      business: { f: [13.00, 19.50], x: [14.50, 21.00] },
      vehicle: { f: [9.75, 13.00], x: [10.75, 14.00] }
    },
    offer: 'Digital home loan'
  },
  {
    name: 'Bank of Baroda', short: 'BOB', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.10, 9.60], x: [8.60, 11.10] },
      lap: { f: [8.85, 12.25], x: [9.85, 13.25] },
      personal: { f: [10.40, 14.25], x: [11.40, 15.25] },
      business: { f: [11.10, 15.75], x: [12.10, 16.75] },
      vehicle: { f: [8.70, 10.90], x: [9.40, 11.90] }
    },
    offer: 'Offer text'
  },
  {
    name: 'Canara Bank', short: 'Canara', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.15, 9.70], x: [8.90, 11.40] },
      lap: { f: [9.00, 12.50], x: [10.00, 13.50] },
      personal: { f: [11.00, 15.50], x: [12.00, 16.00] },
      business: { f: [10.85, 14.00], x: [11.85, 15.00] },
      vehicle: { f: [8.80, 10.30], x: [9.40, 11.20] }
    },
    offer: 'Offer text'
  },
  {
    name: 'IDFC First Bank', short: 'IDFC', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.85, 9.75], x: [9.25, 11.25] },
      lap: { f: [9.50, 13.00], x: [10.50, 14.00] },
      personal: { f: [10.49, 23.00], x: [11.00, 24.00] },
      business: { f: [11.50, 22.00], x: [12.50, 22.00] },
      vehicle: { f: [9.00, 11.50], x: [9.50, 12.00] }
    },
    offer: 'Zero processing'
  },
  {
    name: 'Yes Bank', short: 'Yes', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.45, 10.10], x: [9.10, 11.80] },
      lap: { f: [9.30, 13.20], x: [10.30, 14.20] },
      personal: { f: [10.99, 22.50], x: [11.50, 23.00] },
      business: { f: [11.75, 21.50], x: [12.50, 22.00] },
      vehicle: { f: [9.20, 11.20], x: [9.75, 11.90] }
    },
    offer: 'Offer text'
  },
  {
    name: 'IndusInd Bank', short: 'IndusInd', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.55, 10.20], x: [9.15, 11.90] },
      lap: { f: [9.40, 13.30], x: [10.40, 14.30] },
      personal: { f: [10.49, 23.50], x: [11.25, 24.00] },
      business: { f: [11.90, 22.50], x: [12.50, 23.00] },
      vehicle: { f: [8.95, 11.30], x: [9.50, 12.00] }
    },
    offer: 'Special rates for'
  },
  {
    name: 'Union Bank', short: 'Union', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.25, 9.85], x: [8.95, 11.45] },
      lap: { f: [9.10, 12.60], x: [10.10, 13.60] },
      personal: { f: [11.20, 15.00], x: [11.40, 15.50] },
      business: { f: [10.80, 14.20], x: [11.80, 15.20] },
      vehicle: { f: [8.70, 10.40], x: [9.30, 11.10] }
    },
    offer: 'Offer text'
  },
  {
    name: 'Aditya Birla Capital', short: 'ABCL', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [8.00, 11.50], x: [9.50, 12.50] },
      lap: { f: [9.25, 14.00], x: [10.25, 15.00] },
      personal: { f: [10.50, 25.00], x: [10.99, 26.00] },
      business: { f: [11.50, 23.50], x: [12.00, 24.00] },
      vehicle: { f: [8.85, 11.20], x: [9.10, 11.60] }
    },
    offer: 'Doorstep service'
  },
  {
    name: 'L&T Finance', short: 'L&T', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [8.25, 11.75], x: [9.75, 12.75] },
      lap: { f: [9.50, 14.25], x: [10.50, 15.25] },
      personal: { f: [11.00, 24.00], x: [11.50, 25.00] },
      business: { f: [12.00, 23.50], x: [12.50, 24.00] },
      vehicle: { f: [9.00, 11.50], x: [9.25, 12.00] }
    },
    offer: 'Offer text'
  },
  {
    name: 'Federal Bank', short: 'Federal', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.65, 10.05], x: [9.20, 11.70] },
      lap: { f: [9.35, 12.90], x: [10.35, 13.90] },
      personal: { f: [11.49, 19.50], x: [12.00, 20.00] },
      business: { f: [11.60, 20.50], x: [12.20, 21.00] },
      vehicle: { f: [9.05, 10.90], x: [9.60, 11.50] }
    },
    offer: 'Offer text'
  },
  {
    name: 'AU Small Finance', short: 'AU SFB', type: 'SFB', emoji: '🏦',
    rates: {
      home: { f: [8.50, 12.00], x: [9.75, 13.00] },
      lap: { f: [9.75, 14.50], x: [10.75, 15.50] },
      personal: { f: [11.50, 23.00], x: [11.99, 24.00] },
      business: { f: [12.00, 22.50], x: [12.50, 23.00] },
      vehicle: { f: [9.50, 12.50], x: [10.00, 13.00] }
    },
    offer: 'Tailored product'
  },
  {
    name: 'IDBI Bank', short: 'IDBI', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [8.40, 10.75], x: [9.40, 11.75] },
      lap: { f: [9.00, 12.00], x: [10.00, 13.00] },
      personal: { f: [11.50, 16.00], x: [12.00, 16.50] },
      business: { f: [12.00, 16.50], x: [12.50, 17.00] },
      vehicle: { f: [8.90, 10.50], x: [9.50, 11.50] }
    },
    offer: 'Subsidised rates'
  },
  {
    name: 'Bank of India', short: 'BOI', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [8.30, 10.50], x: [9.30, 11.50] },
      lap: { f: [8.80, 11.50], x: [9.80, 12.50] },
      personal: { f: [11.50, 15.00], x: [11.90, 15.50] },
      business: { f: [11.00, 13.50], x: [12.00, 15.00] },
      vehicle: { f: [8.80, 10.40], x: [9.40, 11.20] }
    },
    offer: 'Zero processing'
  },
  {
    name: 'Indian Bank', short: 'Indian', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [8.40, 10.60], x: [9.20, 11.40] },
      lap: { f: [8.90, 11.60], x: [9.90, 12.60] },
      personal: { f: [11.80, 15.50], x: [12.50, 16.00] },
      business: { f: [11.20, 13.80], x: [12.20, 15.20] },
      vehicle: { f: [9.00, 10.60], x: [9.60, 11.40] }
    },
    offer: 'Special rates for'
  },
  {
    name: 'Punjab & Sind Bank', short: 'PSB', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [8.50, 10.70], x: [9.30, 11.60] },
      lap: { f: [9.00, 11.80], x: [10.00, 12.80] },
      personal: { f: [11.50, 15.20], x: [12.00, 15.80] },
      business: { f: [11.00, 14.00], x: [12.00, 15.50] },
      vehicle: { f: [9.00, 10.80], x: [9.60, 11.40] }
    },
    offer: 'Priority sector co'
  },
  {
    name: 'HSBC India', short: 'HSBC', type: 'Private', emoji: '🌐',
    rates: {
      home: { f: [8.50, 10.85], x: [9.50, 11.85] },
      lap: { f: [9.25, 12.50], x: [10.25, 13.50] },
      personal: { f: [10.25, 17.00], x: [10.75, 17.50] },
      business: { f: [11.50, 17.50], x: [12.00, 18.00] },
      vehicle: { f: [9.00, 11.00], x: [9.50, 11.50] }
    },
    offer: 'Preferential rate'
  },
  {
    name: 'Standard Chartered', short: 'StanC', type: 'Private', emoji: '🌐',
    rates: {
      home: { f: [8.75, 11.00], x: [9.75, 12.00] },
      lap: { f: [9.50, 12.75], x: [10.50, 13.75] },
      personal: { f: [11.00, 17.50], x: [11.49, 18.00] },
      business: { f: [12.50, 19.50], x: [13.00, 20.00] },
      vehicle: { f: [9.25, 11.50], x: [9.75, 12.00] }
    },
    offer: 'Fee waiver for pr'
  },
  {
    name: 'RBL Bank', short: 'RBL', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [9.00, 12.00], x: [10.00, 13.00] },
      lap: { f: [9.50, 13.50], x: [10.50, 14.50] },
      personal: { f: [13.50, 22.00], x: [14.00, 23.00] },
      business: { f: [13.50, 21.50], x: [14.00, 22.00] },
      vehicle: { f: [10.00, 13.50], x: [10.50, 14.00] }
    },
    offer: 'Cashback on EMI'
  },
  {
    name: 'Karnataka Bank', short: 'KarBank', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.75, 11.10], x: [9.75, 12.10] },
      lap: { f: [9.25, 12.00], x: [10.25, 13.00] },
      personal: { f: [12.50, 17.50], x: [13.50, 18.00] },
      business: { f: [11.50, 14.50], x: [12.50, 15.50] },
      vehicle: { f: [9.25, 11.00], x: [9.75, 11.75] }
    },
    offer: 'Special rates for'
  },
  {
    name: 'Saraswat Bank', short: 'Saraswat', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.60, 10.90], x: [9.50, 11.90] },
      lap: { f: [9.10, 12.00], x: [10.00, 13.00] },
      personal: { f: [12.50, 16.50], x: [13.00, 17.00] },
      business: { f: [11.00, 14.00], x: [12.00, 15.00] },
      vehicle: { f: [9.00, 10.75], x: [9.60, 11.50] }
    },
    offer: 'Loyalty benefits'
  },
  {
    name: 'Shriram Housing Finance', short: 'Shriram HF', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [9.50, 13.50], x: [10.50, 14.50] },
      lap: { f: [10.00, 14.50], x: [11.00, 15.50] },
      personal: { f: [12.50, 20.00], x: [13.50, 21.00] },
      business: { f: [12.50, 18.50], x: [13.00, 19.00] },
      vehicle: { f: [9.75, 13.50], x: [10.50, 14.25] }
    },
    offer: 'EWS & LIG segm'
  },
  {
    name: 'GIC Housing Finance', short: 'GIC HF', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [9.00, 11.50], x: [10.00, 12.50] },
      lap: { f: [9.50, 12.50], x: [10.50, 13.50] },
      personal: { f: [12.00, 17.00], x: [13.00, 18.00] },
      business: { f: [12.50, 18.00], x: [13.50, 19.00] },
      vehicle: { f: [9.50, 12.00], x: [10.25, 12.75] }
    },
    offer: 'Insurance bundl'
  },
  {
    name: 'Aavas Financiers', short: 'Aavas', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [10.50, 14.00], x: [11.50, 15.00] },
      lap: { f: [11.00, 15.00], x: [12.00, 16.00] },
      personal: { f: [13.50, 21.00], x: [14.50, 22.00] },
      business: { f: [13.50, 19.50], x: [14.00, 20.00] },
      vehicle: { f: [10.00, 13.50], x: [10.75, 14.25] }
    },
    offer: 'Serving Bharat –'
  },
  {
    name: 'Home First Finance', short: 'HomeFirst', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [10.25, 13.50], x: [11.25, 14.50] },
      lap: { f: [10.75, 14.00], x: [11.75, 15.00] },
      personal: { f: [13.00, 20.00], x: [14.00, 21.00] },
      business: { f: [13.00, 19.00], x: [14.00, 20.00] },
      vehicle: { f: [10.00, 13.00], x: [10.75, 13.75] }
    },
    offer: '₹0 down payme'
  },
  {
    name: 'Mahindra Finance', short: 'Mahindra', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: null, x: null },
      lap: { f: [10.50, 15.00], x: [11.50, 16.00] },
      personal: { f: [15.00, 25.00], x: [16.00, 26.00] },
      business: { f: [13.50, 21.00], x: [14.00, 22.00] },
      vehicle: { f: [9.50, 14.00], x: [10.50, 15.00] }
    },
    offer: 'Specialist in trac'
  },
  {
    name: 'Muthoot Finance', short: 'Muthoot', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: null, x: null },
      lap: { f: [10.00, 14.50], x: [11.00, 15.50] },
      personal: { f: [13.00, 23.00], x: [14.00, 24.00] },
      business: { f: [13.50, 21.00], x: [14.00, 22.00] },
      vehicle: { f: [9.75, 13.00], x: [10.50, 13.75] }
    },
    offer: 'Quick-disbursal'
  },
  {
    name: 'Chola Finance', short: 'Chola', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [9.25, 12.00], x: [10.25, 13.00] },
      lap: { f: [9.75, 13.50], x: [10.75, 14.50] },
      personal: { f: [14.50, 23.50], x: [15.00, 24.00] },
      business: { f: [13.50, 21.00], x: [14.00, 22.00] },
      vehicle: { f: [9.25, 13.00], x: [10.25, 14.00] }
    },
    offer: 'Best-in-class us'
  },
  {
    name: 'Piramal Finance', short: 'Piramal', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [9.50, 13.00], x: [10.50, 14.00] },
      lap: { f: [10.00, 14.50], x: [11.00, 15.50] },
      personal: { f: [13.00, 23.00], x: [14.00, 24.00] },
      business: { f: [12.50, 21.00], x: [13.50, 22.00] },
      vehicle: { f: [9.50, 12.50], x: [10.00, 13.00] }
    },
    offer: 'Doorstep service'
  },
  {
    name: 'Navi Housing Finance', short: 'Navi', type: 'NBFC/HFC', emoji: '📱',
    rates: {
      home: { f: [8.99, 14.00], x: [9.99, 15.00] },
      lap: { f: null, x: null },
      personal: { f: [9.90, 28.00], x: [10.50, 29.00] },
      business: { f: [12.00, 22.00], x: [12.50, 23.00] },
      vehicle: { f: null, x: null }
    },
    offer: '100% digital – in'
  },
  {
    name: 'Sundaram Home Finance', short: 'Sundaram', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [8.60, 11.00], x: [9.60, 12.00] },
      lap: { f: [9.25, 12.00], x: [10.25, 13.00] },
      personal: { f: [12.00, 19.00], x: [13.00, 20.00] },
      business: { f: [12.00, 18.00], x: [13.00, 19.00] },
      vehicle: { f: [9.10, 11.50], x: [9.70, 12.00] }
    },
    offer: 'Special rates for r'
  },
  {
    name: 'Repco Home Finance', short: 'Repco', type: 'NBFC/HFC', emoji: '🏢',
    rates: {
      home: { f: [9.00, 12.00], x: [10.00, 13.00] },
      lap: { f: [9.50, 12.50], x: [10.50, 13.50] },
      personal: { f: [12.50, 19.00], x: [13.50, 20.00] },
      business: { f: [12.50, 18.50], x: [13.50, 19.50] },
      vehicle: { f: [9.50, 12.00], x: [10.25, 12.50] }
    },
    offer: 'Specialists in sal'
  },
  {
    name: 'Equitas Small Finance Bank', short: 'Equitas SFB', type: 'SFB', emoji: '🏦',
    rates: {
      home: { f: [9.25, 13.50], x: [10.25, 14.50] },
      lap: { f: [10.00, 14.00], x: [11.00, 15.00] },
      personal: { f: [13.50, 21.00], x: [14.00, 22.00] },
      business: { f: [14.50, 23.00], x: [15.00, 24.00] },
      vehicle: { f: [9.50, 12.50], x: [10.25, 13.25] }
    },
    offer: 'Priority queue fo'
  },
  {
    name: 'Ujjivan Small Finance Bank', short: 'Ujjivan SFB', type: 'SFB', emoji: '🌟',
    rates: {
      home: { f: [9.50, 13.00], x: [10.50, 14.00] },
      lap: { f: [10.25, 13.50], x: [11.25, 14.50] },
      personal: { f: [15.00, 25.00], x: [16.00, 26.00] },
      business: { f: [15.00, 25.00], x: [16.00, 26.00] },
      vehicle: { f: [10.00, 13.00], x: [10.75, 13.75] }
    },
    offer: 'Digital onboardin'
  },
  {
    name: 'Jana Small Finance Bank', short: 'Jana SFB', type: 'SFB', emoji: '🏢',
    rates: {
      home: { f: [9.90, 14.00], x: [10.90, 15.00] },
      lap: { f: [10.50, 14.50], x: [11.50, 15.50] },
      personal: { f: [16.00, 26.00], x: [17.00, 27.00] },
      business: { f: [14.00, 25.00], x: [15.00, 26.00] },
      vehicle: { f: [10.25, 13.50], x: [11.00, 14.00] }
    },
    offer: 'Special rates for'
  },
  {
    name: 'ESAF Small Finance Bank', short: 'ESAF SFB', type: 'SFB', emoji: '🌱',
    rates: {
      home: { f: [10.00, 14.00], x: [11.00, 15.00] },
      lap: { f: [10.50, 14.50], x: [11.50, 15.50] },
      personal: { f: [15.00, 23.00], x: [16.00, 24.00] },
      business: { f: [14.50, 23.50], x: [15.00, 24.00] },
      vehicle: { f: [10.50, 13.50], x: [11.25, 14.25] }
    },
    offer: 'Micro-loans for r'
  },
  {
    name: 'Tata Capital Housing Finance', short: 'TCHF', type: 'NBFC/HFC', emoji: '🏠',
    rates: {
      home: { f: [8.75, 11.00], x: [9.75, 12.00] },
      lap: { f: [9.25, 12.50], x: [10.25, 13.50] },
      personal: { f: [11.00, 20.00], x: [12.00, 21.00] },
      business: { f: [12.00, 21.00], x: [13.00, 22.00] },
      vehicle: { f: [9.00, 11.50], x: [9.75, 12.00] }
    },
    offer: 'Balance transfer'
  },
  {
    name: 'Central Bank of India', short: 'CBI', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.25, 9.90], x: [8.85, 11.50] },
      lap: { f: [9.15, 12.40], x: [10.15, 13.40] },
      personal: { f: [11.00, 15.25], x: [12.00, 16.00] },
      business: { f: [10.90, 14.25], x: [11.90, 15.25] },
      vehicle: { f: [8.85, 10.50], x: [9.45, 11.25] }
    },
    offer: 'Cent Home Loan discount'
  },
  {
    name: 'Indian Overseas Bank', short: 'IOB', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.35, 9.80], x: [8.90, 11.40] },
      lap: { f: [9.20, 12.50], x: [10.20, 13.50] },
      personal: { f: [11.25, 15.50], x: [12.25, 16.50] },
      business: { f: [11.00, 14.50], x: [12.00, 15.50] },
      vehicle: { f: [8.90, 10.60], x: [9.50, 11.35] }
    },
    offer: 'Subha Gruha Scheme'
  },
  {
    name: 'UCO Bank', short: 'UCO', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.20, 9.75], x: [8.80, 11.30] },
      lap: { f: [9.10, 12.30], x: [10.10, 13.30] },
      personal: { f: [11.10, 15.20], x: [12.10, 16.00] },
      business: { f: [10.85, 14.10], x: [11.85, 15.10] },
      vehicle: { f: [8.80, 10.45], x: [9.40, 11.15] }
    },
    offer: 'UCO Shelter special'
  },
  {
    name: 'Bank of Maharashtra', short: 'BOM', type: 'PSU', emoji: '🏛️',
    rates: {
      home: { f: [7.15, 9.60], x: [8.70, 11.15] },
      lap: { f: [8.95, 12.10], x: [9.95, 13.10] },
      personal: { f: [10.80, 14.75], x: [11.80, 15.50] },
      business: { f: [10.75, 13.90], x: [11.75, 14.90] },
      vehicle: { f: [8.70, 10.30], x: [9.30, 11.00] }
    },
    offer: 'Maha Super Housing'
  },
  {
    name: 'South Indian Bank', short: 'SIB', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [7.70, 10.25], x: [9.15, 11.75] },
      lap: { f: [9.30, 12.80], x: [10.30, 13.80] },
      personal: { f: [11.50, 18.50], x: [12.50, 19.50] },
      business: { f: [11.75, 19.00], x: [12.50, 20.00] },
      vehicle: { f: [9.10, 11.20], x: [9.70, 11.80] }
    },
    offer: 'Concessional processing fees'
  },
  {
    name: 'Karur Vysya Bank', short: 'KVB', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.75, 11.00], x: [9.75, 12.00] },
      lap: { f: [9.25, 12.00], x: [10.25, 13.00] },
      personal: { f: [11.00, 17.50], x: [11.50, 18.00] },
      business: { f: [11.50, 18.50], x: [12.00, 19.00] },
      vehicle: { f: [9.00, 12.50], x: [10.00, 13.50] }
    },
    offer: 'Corporate employee concession'
  },
  {
    name: 'City Union Bank', short: 'CUB', type: 'Private', emoji: '🏛',
    rates: {
      home: { f: [9.00, 11.50], x: [10.00, 12.50] },
      lap: { f: [9.50, 12.50], x: [10.50, 13.50] },
      personal: { f: [11.50, 19.00], x: [12.00, 20.00] },
      business: { f: [11.50, 19.50], x: [12.00, 20.00] },
      vehicle: { f: [9.25, 12.00], x: [10.25, 13.00] }
    },
    offer: 'Quick SME turnaround'
  },
  {
    name: 'Bandhan Bank', short: 'Bandhan', type: 'Private', emoji: '🤝',
    rates: {
      home: { f: [9.16, 13.33], x: [10.16, 14.33] },
      lap: { f: [9.75, 13.50], x: [10.75, 14.50] },
      personal: { f: [14.00, 23.00], x: [15.00, 24.00] },
      business: { f: [15.00, 25.00], x: [16.00, 26.00] },
      vehicle: { f: [9.50, 12.50], x: [10.00, 13.00] }
    },
    offer: 'Affordable home loans from ₹2L'
  },
  {
    name: 'CSB Bank', short: 'CSB', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.50, 11.25], x: [9.50, 12.25] },
      lap: { f: [9.40, 13.00], x: [10.40, 14.00] },
      personal: { f: [12.00, 19.50], x: [13.00, 20.50] },
      business: { f: [12.00, 19.00], x: [12.75, 20.00] },
      vehicle: { f: [9.20, 11.75], x: [9.80, 12.25] }
    },
    offer: 'Fast mortgage approval'
  },
  {
    name: 'DCB Bank', short: 'DCB', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.65, 11.50], x: [9.65, 12.50] },
      lap: { f: [9.50, 13.25], x: [10.50, 14.25] },
      personal: { f: [12.50, 21.00], x: [13.50, 22.00] },
      business: { f: [12.25, 20.50], x: [13.00, 21.50] },
      vehicle: { f: [9.35, 12.00], x: [10.00, 12.50] }
    },
    offer: 'DCB Suraksha covered loan'
  },
  {
    name: 'Tamilnad Mercantile Bank', short: 'TMB', type: 'Private', emoji: '🏦',
    rates: {
      home: { f: [8.60, 10.95], x: [9.60, 11.95] },
      lap: { f: [9.25, 12.25], x: [10.25, 13.25] },
      personal: { f: [11.75, 17.50], x: [12.50, 18.00] },
      business: { f: [11.50, 16.50], x: [12.25, 17.50] },
      vehicle: { f: [9.15, 11.20], x: [9.75, 11.80] }
    },
    offer: 'Agricultural & rural concession'
  },
  {
    name: 'Jammu & Kashmir Bank', short: 'JKB', type: 'Private', emoji: '🏔️',
    rates: {
      home: { f: [8.35, 10.50], x: [9.35, 11.50] },
      lap: { f: [9.00, 12.00], x: [10.00, 13.00] },
      personal: { f: [11.25, 16.00], x: [12.00, 16.75] },
      business: { f: [11.00, 15.00], x: [11.75, 16.00] },
      vehicle: { f: [8.95, 10.75], x: [9.50, 11.40] }
    },
    offer: 'JK Gharonda scheme'
  },
  {
    name: 'DBS Bank India', short: 'DBS', type: 'Private', emoji: '🌏',
    rates: {
      home: { f: [8.75, 10.25], x: [9.75, 11.25] },
      lap: { f: [9.25, 12.00], x: [10.25, 13.00] },
      personal: { f: [11.50, 20.00], x: [12.00, 21.00] },
      business: { f: [12.50, 18.50], x: [13.00, 19.00] },
      vehicle: { f: [9.00, 11.50], x: [9.50, 12.00] }
    },
    offer: 'Dedicated Relationship Manager'
  },
  {
    name: 'Suryoday Small Finance Bank', short: 'Suryoday SFB', type: 'SFB', emoji: '☀️',
    rates: {
      home: { f: [9.75, 13.75], x: [10.75, 14.75] },
      lap: { f: [10.50, 14.25], x: [11.50, 15.25] },
      personal: { f: [15.50, 25.00], x: [16.50, 26.00] },
      business: { f: [14.50, 24.50], x: [15.50, 25.50] },
      vehicle: { f: [10.20, 13.50], x: [11.00, 14.00] }
    },
    offer: 'Affordable home loans'
  },
  {
    name: 'Utkarsh Small Finance Bank', short: 'Utkarsh SFB', type: 'SFB', emoji: '🌾',
    rates: {
      home: { f: [9.80, 13.90], x: [10.80, 14.90] },
      lap: { f: [10.60, 14.30], x: [11.60, 15.30] },
      personal: { f: [15.75, 25.50], x: [16.75, 26.50] },
      business: { f: [14.75, 24.75], x: [15.75, 25.75] },
      vehicle: { f: [10.30, 13.60], x: [11.10, 14.10] }
    },
    offer: 'Rural enterprise concession'
  },
  {
    name: 'Bajaj Housing Finance', short: 'BJF Housing', type: 'NBFC/HFC', emoji: '🏠',
    rates: {
      home: { f: [8.50, 14.00], x: [9.50, 15.00] },
      lap: { f: [9.00, 14.50], x: [10.00, 15.50] },
      personal: { f: [11.50, 20.00], x: [12.50, 21.00] },
      business: { f: [12.50, 21.00], x: [13.00, 22.00] },
      vehicle: { f: [9.00, 11.50], x: [9.50, 12.00] }
    },
    offer: 'Instant 5-minute pre-approval'
  },
  {
    name: 'Aditya Birla Housing Finance', short: 'ABHFL', type: 'NBFC/HFC', emoji: '🏗',
    rates: {
      home: { f: [8.60, 11.50], x: [9.60, 12.50] },
      lap: { f: [9.10, 12.00], x: [10.10, 13.00] },
      personal: { f: [11.50, 20.00], x: [12.50, 21.00] },
      business: { f: [12.00, 19.50], x: [13.00, 20.00] },
      vehicle: { f: [9.10, 11.50], x: [9.60, 12.00] }
    },
    offer: 'Top-up loan facility'
  },
  {
    name: 'Manappuram Finance', short: 'Manappuram', type: 'NBFC/HFC', emoji: '🥇',
    rates: {
      home: { f: [9.80, 13.75], x: [10.80, 14.75] },
      lap: { f: [10.25, 14.75], x: [11.25, 15.75] },
      personal: { f: [11.50, 28.00], x: [12.00, 29.00] },
      business: { f: [13.50, 26.00], x: [14.00, 27.00] },
      vehicle: { f: [10.00, 13.50], x: [10.75, 14.25] }
    },
    offer: 'Gold-backed personal loan'
  },
  {
    name: 'Shriram Finance', short: 'Shriram', type: 'NBFC/HFC', emoji: '🏭',
    rates: {
      home: { f: [10.00, 14.00], x: [11.00, 15.00] },
      lap: { f: [10.50, 14.50], x: [11.50, 15.50] },
      personal: { f: [14.50, 25.50], x: [15.00, 26.00] },
      business: { f: [13.50, 23.50], x: [14.00, 24.00] },
      vehicle: { f: [10.00, 16.00], x: [11.00, 17.00] }
    },
    offer: 'Used CV and vehicle loan leader'
  },
  {
    name: 'Poonawalla Fincorp', short: 'Poonawalla', type: 'NBFC/HFC', emoji: '💎',
    rates: {
      home: { f: [9.00, 13.00], x: [10.00, 14.00] },
      lap: { f: [9.50, 13.50], x: [10.50, 14.50] },
      personal: { f: [10.50, 22.00], x: [11.00, 23.00] },
      business: { f: [11.50, 21.00], x: [12.50, 22.00] },
      vehicle: { f: [9.25, 12.50], x: [10.00, 13.25] }
    },
    offer: 'Zero foreclosure charges'
  },
  {
    name: 'Hero Fincorp', short: 'Hero', type: 'NBFC/HFC', emoji: '🏍️',
    rates: {
      home: { f: [9.25, 13.50], x: [10.25, 14.50] },
      lap: { f: [9.75, 14.00], x: [10.75, 15.00] },
      personal: { f: [11.50, 24.00], x: [12.00, 25.00] },
      business: { f: [12.50, 22.00], x: [13.50, 23.00] },
      vehicle: { f: [9.00, 13.50], x: [10.00, 14.50] }
    },
    offer: 'Two-wheeler & used car finance'
  },
  {
    name: 'IIFL Finance', short: 'IIFL', type: 'NBFC/HFC', emoji: '📊',
    rates: {
      home: { f: [8.90, 13.00], x: [9.90, 14.00] },
      lap: { f: [9.50, 14.00], x: [10.50, 15.00] },
      personal: { f: [12.75, 24.00], x: [13.50, 25.00] },
      business: { f: [12.50, 23.00], x: [13.50, 24.00] },
      vehicle: { f: [9.50, 13.00], x: [10.50, 14.00] }
    },
    offer: 'Instant gold & business loan'
  }
];

export async function syncAllLendersToDB() {
  console.log(`[LenderSeed] Syncing all ${ALL_LENDERS_DATA.length} lenders to database...`);
  try {
    const loanTypes = await Loan_type.findAll({ raw: true });
    const typeMap = {};
    loanTypes.forEach(lt => {
      typeMap[lt.short_id] = lt.id;
    });

    for (const bank of ALL_LENDERS_DATA) {
      // 1. Find or create Lender
      const [lenderRecord] = await Lender.findOrCreate({
        where: { name: bank.name },
        defaults: {
          name: bank.name,
          short: bank.short,
          type: bank.type,
          offer: bank.offer
        }
      });

      // Update type or offer if already existing
      await lenderRecord.update({
        short: bank.short,
        type: bank.type,
        offer: bank.offer
      });

      // 2. Sync rates for all loan types
      const categories = ['home', 'personal', 'lap', 'business', 'vehicle'];
      for (const cat of categories) {
        const loanTypeId = typeMap[cat];
        if (!loanTypeId) continue;

        const rateObj = bank.rates[cat];
        if (!rateObj) continue;

        // Floating rate
        if (rateObj.f && rateObj.f.length === 2) {
          const [floatRecord, createdFloat] = await Lender_Loan_Rates.findOrCreate({
            where: { lender_id: lenderRecord.id, loan_type_id: loanTypeId, rate_type: 'floating' },
            defaults: {
              min_rate: rateObj.f[0],
              max_rate: rateObj.f[1],
              offer: bank.offer,
              effective_from: new Date()
            }
          });
          if (!createdFloat) {
            await floatRecord.update({
              min_rate: rateObj.f[0],
              max_rate: rateObj.f[1],
              offer: bank.offer
            });
          }
        }

        // Fixed rate
        if (rateObj.x && rateObj.x.length === 2) {
          const [fixedRecord, createdFixed] = await Lender_Loan_Rates.findOrCreate({
            where: { lender_id: lenderRecord.id, loan_type_id: loanTypeId, rate_type: 'fixed' },
            defaults: {
              min_rate: rateObj.x[0],
              max_rate: rateObj.x[1],
              offer: bank.offer,
              effective_from: new Date()
            }
          });
          if (!createdFixed) {
            await fixedRecord.update({
              min_rate: rateObj.x[0],
              max_rate: rateObj.x[1],
              offer: bank.offer
            });
          }
        }
      }
    }
    console.log(`[LenderSeed] Successfully synced ${ALL_LENDERS_DATA.length} lenders into database.`);
  } catch (error) {
    console.error("[LenderSeed] Error syncing lenders to database:", error);
  }
}
