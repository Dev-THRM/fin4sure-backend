import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Lender_Application = sequelize.define('Lender_Application', {
  loan_application_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lender_rate_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'inactive'),
    allowNull: false,
    defaultValue: 'pending'
  },
  finalized_rate: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'The finalized interest rate (%) agreed with the lender. Stored here because lender_loan_rates only tracks min/max range.'
  }
}, {
  tableName: 'lender_applications',
  timestamps: true,
});

export default Lender_Application;
