'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_applications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      application_no: {
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      lender_id: {
        type: Sequelize.INTEGER
      },
      loan_type_id: {
        type: Sequelize.INTEGER
      },
      loan_amount: {
        type: Sequelize.DOUBLE
      },
      loan_purpose: {
        type: Sequelize.STRING
      },
      tenure: {
        type: Sequelize.INTEGER
      },
      status_id: {
        type: Sequelize.INTEGER
      },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      client_preference: {
        type: Sequelize.ENUM('direct_reach', 'partner_routing'),
        allowNull: true
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
    await queryInterface.dropTable('loan_applications');
  }
};