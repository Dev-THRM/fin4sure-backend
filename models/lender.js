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
  url: {
    type: DataTypes.STRING,
  },
  tc: {
    type: DataTypes.TEXT,
  },
  offer: {
    type: DataTypes.TEXT,
  },
  logo: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
});

export default Lender;