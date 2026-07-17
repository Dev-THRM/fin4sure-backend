import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Loan_Application = sequelize.define('Loan_Application', {
  application_no: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  loan_type_id: DataTypes.INTEGER,
  loan_amount: DataTypes.DOUBLE,
  loan_purpose: DataTypes.STRING,
  tenure: DataTypes.INTEGER,
  status_id: DataTypes.INTEGER,
  partner_id: DataTypes.INTEGER
}, {
  timestamps: true,
});

export default Loan_Application;