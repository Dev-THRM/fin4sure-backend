'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lender_applications', 'finalized_rate', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'The finalized interest rate (%) agreed upon between the lender and borrower. Stored here because lender_loan_rates only holds min/max range.'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('lender_applications', 'finalized_rate');
  }
};
