import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Bank = sequelize.define('Bank', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  product: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
}, {
  tableName: 'banks',
  timestamps: true,
});

export default Bank;
