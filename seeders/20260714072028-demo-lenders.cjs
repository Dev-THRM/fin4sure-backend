'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Insert Lenders
    await queryInterface.bulkInsert('Lenders', [
      {
        name: 'State Bank of India',
        short: 'SBI',
        type: 'psu',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'HDFC Bank',
        short: 'HDFC',
        type: 'private',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'ICICI Bank',
        short: 'ICICI',
        type: 'private',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // 2. Fetch IDs
    const [lenders] = await queryInterface.sequelize.query(`SELECT id, short FROM Lenders;`);
    const [loanTypes] = await queryInterface.sequelize.query(`SELECT id, short_id FROM Loan_types;`);
    
    const lenderMap = {};
    lenders.forEach(l => lenderMap[l.short] = l.id);
    
    const typeMap = {};
    loanTypes.forEach(lt => typeMap[lt.short_id] = lt.id);

    // 3. Construct Rates Array
    const ratesToInsert = [];
    
    const addRate = (lenderShort, typeShort, rateType, min, max) => {
      if (!lenderMap[lenderShort] || !typeMap[typeShort] || !min) return;
      ratesToInsert.push({
        lender_id: lenderMap[lenderShort],
        loan_type_id: typeMap[typeShort],
        rate_type: rateType,
        min_rate: min,
        max_rate: max || min, // Fallback if max isn't provided
        effective_from: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    };

    // SBI Rates
    addRate('SBI', 'home', 'floating', 7.10, 9.65);
    addRate('SBI', 'home', 'fixed', 8.70, 11.20);
    addRate('SBI', 'lap', 'floating', 8.55, 11.05);
    addRate('SBI', 'lap', 'fixed', 9.55, 12.05);
    addRate('SBI', 'personal', 'fixed', 11.45, 14.80);
    addRate('SBI', 'business', 'floating', 10.75, 13.05);
    addRate('SBI', 'business', 'fixed', 12.05, 15.05);
    addRate('SBI', 'vehicle', 'floating', 8.75, 10.25);
    addRate('SBI', 'vehicle', 'fixed', 9.25, 11.05);

    // HDFC Rates
    addRate('HDFC', 'home', 'floating', 8.50, 9.90);
    addRate('HDFC', 'home', 'fixed', 9.00, 11.50);
    addRate('HDFC', 'lap', 'floating', 9.00, 11.50);
    addRate('HDFC', 'lap', 'fixed', 10.00, 12.50);
    addRate('HDFC', 'personal', 'fixed', 10.50, 21.00);
    addRate('HDFC', 'business', 'fixed', 15.00, 20.00);
    addRate('HDFC', 'vehicle', 'floating', 8.90, 10.50);

    // ICICI Rates
    addRate('ICICI', 'home', 'floating', 8.75, 10.05);
    addRate('ICICI', 'home', 'fixed', 9.25, 11.60);
    addRate('ICICI', 'lap', 'floating', 9.10, 11.60);
    addRate('ICICI', 'lap', 'fixed', 10.10, 12.60);
    addRate('ICICI', 'personal', 'fixed', 10.75, 19.00);
    addRate('ICICI', 'business', 'fixed', 14.00, 19.50);
    addRate('ICICI', 'vehicle', 'floating', 9.00, 10.75);

    if (ratesToInsert.length > 0) {
      await queryInterface.bulkInsert('Lender_Loan_Rates', ratesToInsert, {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Lender_Loan_Rates', null, {});
    await queryInterface.bulkDelete('Lenders', null, {});
  }
};
