import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import City from './city.js';

const Partner = sequelize.define('Partner', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  city_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Cities',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'partners',
  timestamps: true,
});

Partner.belongsTo(City, { foreignKey: 'city_id', as: 'city' });

export default Partner;
