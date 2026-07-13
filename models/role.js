import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Role = sequelize.define('Role', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
});

Role.associate = (models) => {
  Role.hasMany(models.User, {
    foreignKey: 'role_id',
    as: 'users'
  });
};

export default Role;