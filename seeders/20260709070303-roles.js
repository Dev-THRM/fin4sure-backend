'use strict';

const { QueryError } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */

    await queryInterface.bulkInsert('Role', [
    {
      name: 'Admin',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Borrower',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Lender',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: "Partner",
      created_at: new Date(),
      updated_at: new Date()
    }
  ], {})
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     */
  
    await queryInterface.bulkDelete('Role', null, {});

  }
};
