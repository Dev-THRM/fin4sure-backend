import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const PlatformSetting = sequelize.define('PlatformSetting', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'platform_settings',
  timestamps: true
});

export default PlatformSetting;
