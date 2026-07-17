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
  }
}, {
  tableName: 'lender_applications',
  timestamps: true,
});

export default Lender_Application;
