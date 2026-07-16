'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Statuses', [
      {
        name: 'applied',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'docs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'credit',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'sanction',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'legal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'disbursed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Statuses', null, {});
  }
};
