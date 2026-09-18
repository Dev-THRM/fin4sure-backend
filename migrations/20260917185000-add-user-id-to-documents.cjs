'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('documents');
      if (!tableInfo.user_id) {
        await queryInterface.addColumn('documents', 'user_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }
      if (tableInfo.loan_application_id) {
        await queryInterface.changeColumn('documents', 'loan_application_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }
    } catch (e) {
      console.warn('Migration add-user-id-to-documents warning:', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('documents', 'user_id');
    } catch (_) {}
  }
};
