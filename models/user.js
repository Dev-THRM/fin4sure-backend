import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  password_hash: DataTypes.STRING,
  mob_no: DataTypes.STRING,
  role_id: DataTypes.INTEGER,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  timestamps: true,
});

export default User;