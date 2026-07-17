import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const City = sequelize.define('City', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  district_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'cities',
  timestamps: true,
});

export default City;
