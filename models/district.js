import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const District = sequelize.define('District', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true,
});

export default District;
