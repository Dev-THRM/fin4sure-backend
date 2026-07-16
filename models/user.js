import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  password_hash: DataTypes.STRING,
  mob_no: DataTypes.STRING,
  role_id: DataTypes.INTEGER,
  status: DataTypes.ENUM('active', 'suspended', 'pending verification', 'draft')
}, {
  timestamps: true,
});

export default User;