'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Lenders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      short: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      emoji: {
        type: Sequelize.STRING
      },
      color: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      rates: {
        type: Sequelize.JSON
      },
      tc: {
        type: Sequelize.TEXT
      },
      offer: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Lenders');
  }
};