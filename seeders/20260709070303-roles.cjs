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

    await queryInterface.bulkInsert('roles', [
    {
      name: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Borrower',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Lender',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: "Partner",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ], {})
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     */
  
    await queryInterface.bulkDelete('roles', null, {});

  }
};
