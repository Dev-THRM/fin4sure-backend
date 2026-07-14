'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Otp_Verifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      mob_no: {
        type: Sequelize.STRING
      },
      otp_hash: {
        type: Sequelize.STRING
      },
      purpose: {
        type: Sequelize.STRING
      },
      expires_at: {
        type: Sequelize.DATE
      },
      verified_at: {
        type: Sequelize.DATE
      },
      attempts: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('Otp_Verifications');
  }
};