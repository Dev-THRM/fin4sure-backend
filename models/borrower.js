import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Borrower = sequelize.define('Borrower', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pincode_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  profile_status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected'),
    allowNull: false,
    defaultValue: 'Active'
  }
}, {
  tableName: 'borrowers',
  timestamps: true,
});

export default Borrower;
