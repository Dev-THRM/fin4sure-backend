'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'email' column to otp_verifications table
    // mob_no is kept intact so mobile OTP can be re-enabled at any time
    await queryInterface.addColumn('otp_verifications', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('otp_verifications', 'email');
  },
};
