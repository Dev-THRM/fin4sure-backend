'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Loan_Applications', 'min_rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('Loan_Applications', 'max_rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('Loan_Applications', 'rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Loan_Applications', 'min_rate');
    await queryInterface.removeColumn('Loan_Applications', 'max_rate');
    await queryInterface.removeColumn('Loan_Applications', 'rate');
  }
};
