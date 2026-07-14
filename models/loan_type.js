import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Loan_type = sequelize.define('Loan_type', {
  name: {
    type: DataTypes.STRING,
  },
  icon: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.STRING,
  },
  short_id: {
    type: DataTypes.STRING,
  }
}, {
  timestamps: true,
});

export default Loan_type;