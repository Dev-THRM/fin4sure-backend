'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('loan_applications', 'partner_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'partners',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('loan_applications', 'partner_id');
    } catch (error) {}
  }
};
