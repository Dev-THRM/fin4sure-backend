'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Lender_Loan_Rates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      lender_id: {
        type: Sequelize.INTEGER
      },
      loan_type_id: {
        type: Sequelize.INTEGER
      },
      rate_type: {
        type: Sequelize.ENUM('floating', 'fixed')
      },
      min_rate: {
        type: Sequelize.DOUBLE
      },
      max_rate: {
        type: Sequelize.DOUBLE
      },

      effective_from: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Lender_Loan_Rates');
  }
};