import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Lender_Loan_Rates = sequelize.define('Lender_Loan_Rates', {
  lender_id: {
    type: DataTypes.INTEGER,
  },
  loan_type_id: {
    type: DataTypes.INTEGER,
  },
  rate_type: {
    type: DataTypes.ENUM('floating', 'fixed'),
  },
  min_rate: {
    type: DataTypes.DOUBLE,
  },
  max_rate: {
    type: DataTypes.DOUBLE,
  },

  effective_from: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'lender_loan_rates',
  timestamps: true,
});

export default Lender_Loan_Rates;