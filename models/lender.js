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
  emoji: {
    type: DataTypes.STRING,
  },
  color: {
    type: DataTypes.STRING,
  },
  url: {
    type: DataTypes.STRING,
  },
  rates: {
    type: DataTypes.JSON,
  },
  tc: {
    type: DataTypes.TEXT,
  },
  offer: {
    type: DataTypes.TEXT,
  },
}, {
  timestamps: true,
});

export default Lender;