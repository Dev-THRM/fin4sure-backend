import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Lender = sequelize.define('Lender', {
  name: {
    type: DataTypes.STRING,
  },
  short: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.STRING,
  },

}, {
  tableName: 'lenders',
  timestamps: true,
});

export default Lender;