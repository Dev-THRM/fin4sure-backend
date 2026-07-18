import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const RelationshipManager = sequelize.define('RelationshipManager', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  mob: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
    validate: {
      isEmail: true
    }
  },
  availability: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Mon-Sat 9:30 AM–6:30 PM IST'
  }
}, {
  tableName: 'relationship_managers',
  timestamps: true
});

export default RelationshipManager;
