'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'lastLogin', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('admins', 'sessionStatus', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Inactive'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('admins', 'lastLogin');
    await queryInterface.removeColumn('admins', 'sessionStatus');
  }
};
