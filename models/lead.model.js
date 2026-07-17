import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { LOAN_PRODUCT_IDS } from '../utils/constants.js';

const Lead = sequelize.define('Lead', {
  client_id: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pan_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pan_encrypted: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  product: {
    type: DataTypes.ENUM(...LOAN_PRODUCT_IDS),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  broker_id: {
    type: DataTypes.STRING,
    defaultValue: 'self',
  },
  dob: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  statusUpdatedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'leads',
  timestamps: true,
});

export default Lead;
