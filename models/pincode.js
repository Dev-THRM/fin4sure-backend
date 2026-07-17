import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Pincode = sequelize.define('Pincode', {
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'pincodes',
  timestamps: true,
});

export default Pincode;
