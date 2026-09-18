import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Borrower = sequelize.define('Borrower', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pincode_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  profile_status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected'),
    allowNull: true,
    defaultValue: 'Active'
  }
}, {
  tableName: 'borrowers',
  timestamps: true,
});

export default Borrower;
