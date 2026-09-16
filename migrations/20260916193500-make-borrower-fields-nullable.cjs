'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.changeColumn('borrowers', 'dob', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (e) {
      console.warn('Could not alter dob to nullable', e.message);
    }

    try {
      await queryInterface.changeColumn('borrowers', 'gender', {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      });
    } catch (e) {
      console.warn('Could not alter gender to nullable', e.message);
    }

    try {
      await queryInterface.changeColumn('borrowers', 'address', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } catch (e) {
      console.warn('Could not alter address to nullable', e.message);
    }

    try {
      await queryInterface.changeColumn('borrowers', 'pincode_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } catch (e) {
      console.warn('Could not alter pincode_id to nullable', e.message);
    }

    try {
      await queryInterface.changeColumn('borrowers', 'profile_status', {
        type: Sequelize.ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected'),
        allowNull: true,
        defaultValue: 'Active'
      });
    } catch (e) {
      console.warn('Could not alter profile_status', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Reversible if necessary
  }
};
