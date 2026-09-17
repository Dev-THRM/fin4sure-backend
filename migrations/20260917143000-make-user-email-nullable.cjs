'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.changeColumn('users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    } catch (e) {
      console.warn('Could not alter user.email to nullable', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Reversible if needed
  }
};
