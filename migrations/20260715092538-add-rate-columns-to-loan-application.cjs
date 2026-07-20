'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('loan_applications', 'min_rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('loan_applications', 'max_rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('loan_applications', 'rate', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('loan_applications', 'min_rate');
    await queryInterface.removeColumn('loan_applications', 'max_rate');
    await queryInterface.removeColumn('loan_applications', 'rate');
  }
};
