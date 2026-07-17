'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try { await queryInterface.removeColumn('Loan_Applications', 'lender_id'); } catch (e) {}
    try { await queryInterface.removeColumn('Loan_Applications', 'min_rate'); } catch (e) {}
    try { await queryInterface.removeColumn('Loan_Applications', 'max_rate'); } catch (e) {}
    try { await queryInterface.removeColumn('Loan_Applications', 'rate'); } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Loan_Applications', 'lender_id', {
      type: Sequelize.INTEGER,
      references: { model: 'lenders', key: 'id' }
    });
    await queryInterface.addColumn('Loan_Applications', 'min_rate', { type: Sequelize.DOUBLE });
    await queryInterface.addColumn('Loan_Applications', 'max_rate', { type: Sequelize.DOUBLE });
    await queryInterface.addColumn('Loan_Applications', 'rate', { type: Sequelize.DOUBLE });
  }
};
