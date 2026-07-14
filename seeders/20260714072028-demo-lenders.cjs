'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Lenders', [
      {
        name: 'State Bank of India',
        short: 'SBI',
        type: 'psu',
        emoji: '🏛️',
        color: '#003399',
        url: 'https://sbi.co.in',
        rates: JSON.stringify({
          home: {f: [7.10, 9.65], x: [8.70, 11.20]},
          lap: {f: [8.55, 11.05], x: [9.55, 12.05]},
          personal: {f: null, x: [11.45, 14.80]},
          business: {f: [10.75, 13.05], x: [12.05, 15.05]},
          vehicle: {f: [8.75, 10.25], x: [9.25, 11.05]}
        }),
        tc: 'Linked to EBLR. Women borrowers get 5 bps concession. Zero prepayment on floating loans.',
        offer: '🎁 Zero PF on home loans for women (festive offer — verify at branch)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'HDFC Bank',
        short: 'HDFC',
        type: 'private',
        emoji: '🏦',
        color: '#004c8f',
        url: 'https://hdfcbank.com',
        rates: JSON.stringify({
          home: {f: [8.50, 9.90], x: [9.00, 11.50]},
          lap: {f: [9.00, 11.50], x: [10.00, 12.50]},
          personal: {f: null, x: [10.50, 21.00]},
          business: {f: null, x: [15.00, 20.00]},
          vehicle: {f: [8.90, 10.50], x: null}
        }),
        tc: 'Rates are linked to Repo Rate. Foreclosure charges apply as per terms.',
        offer: '🎉 50% off on processing fees for salaried professionals.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'ICICI Bank',
        short: 'ICICI',
        type: 'private',
        emoji: '🏦',
        color: '#f05a22',
        url: 'https://icicibank.com',
        rates: JSON.stringify({
          home: {f: [8.75, 10.05], x: [9.25, 11.60]},
          lap: {f: [9.10, 11.60], x: [10.10, 12.60]},
          personal: {f: null, x: [10.75, 19.00]},
          business: {f: null, x: [14.00, 19.50]},
          vehicle: {f: [9.00, 10.75], x: null}
        }),
        tc: 'Rates subject to credit score and loan amount. Prepayment allowed after 1 year.',
        offer: '⚡ Instant approval for pre-approved salary account holders.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Lenders', null, {});
  }
};
