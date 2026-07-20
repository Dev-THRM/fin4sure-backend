'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try { await queryInterface.removeColumn('loan_applications', 'lender_id'); } catch (e) {}
    try { await queryInterface.removeColumn('loan_applications', 'min_rate'); } catch (e) {}
    try { await queryInterface.removeColumn('loan_applications', 'max_rate'); } catch (e) {}
    try { await queryInterface.removeColumn('loan_applications', 'rate'); } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('loan_applications', 'lender_id', {
      type: Sequelize.INTEGER,
      references: { model: 'lenders', key: 'id' }
    });
    await queryInterface.addColumn('loan_applications', 'min_rate', { type: Sequelize.DOUBLE });
    await queryInterface.addColumn('loan_applications', 'max_rate', { type: Sequelize.DOUBLE });
    await queryInterface.addColumn('loan_applications', 'rate', { type: Sequelize.DOUBLE });
  }
};
