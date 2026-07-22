import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Loan_Application = sequelize.define('Loan_Application', {
  application_no: DataTypes.INTEGER,
  borrower_id: DataTypes.INTEGER,
  loan_type_id: DataTypes.INTEGER,
  loan_amount: DataTypes.DOUBLE,
  loan_purpose: DataTypes.STRING,
  tenure: DataTypes.INTEGER,
  status_id: DataTypes.INTEGER,
  partner_id: { type: DataTypes.INTEGER, allowNull: true },
  client_preference: {
    type: DataTypes.ENUM('direct_reach', 'partner_routing'),
    allowNull: true,
  },
}, {
  tableName: 'loan_applications',
  timestamps: true,
});

export default Loan_Application;