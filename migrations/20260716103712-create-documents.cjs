'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Documents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      loan_application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Loan_Applications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      document_type: {
        type: Sequelize.ENUM('aadhar', 'pan', 'bank statement', 'salary slip'),
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
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
    await queryInterface.dropTable('Documents');
  }
};
