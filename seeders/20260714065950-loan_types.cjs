'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Loan_types', [
      {
        name: 'Home Loan',
        icon: '🏠',
        description: 'Buy, build or renovate your home',
        short_id: 'home',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Personal Loan",
        icon: '💳',
        description: 'Quick funds for personal needs',
        short_id: 'personal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Loan Against Property',
        icon: '🏢',
        description: 'Leverage your residential/commercial property',
        short_id: 'lap',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Business Loan',
        icon: '📦',
        description: 'Working capital and business expansion',
        short_id: 'business',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vehicle Loan',
        icon: '🚗',
        description: 'Finance your new or used vehicle',
        short_id: 'vehicle',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {})
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Loan_types', null, {});
  }
};
