import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const State = sequelize.define('State', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'India'
  }
}, {
  tableName: 'states',
  timestamps: true,
});

export default State;
