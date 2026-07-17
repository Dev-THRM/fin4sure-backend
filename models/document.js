import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Document = sequelize.define('Document', {
  loan_application_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM('aadhar', 'pan', 'bank statement', 'salary slip'),
    allowNull: false
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
});

export default Document;
