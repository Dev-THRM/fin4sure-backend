import Lender from './lender.js';
import Loan_type from './loan_type.js';
import Lender_Loan_Rates from './lender_loan_rates.js';
import State from './state.js';
import District from './district.js';
import City from './city.js';
import Pincode from './pincode.js';
import Borrower from './borrower.js';
import User from './user.js';
import Role from './role.js';
import Loan_Application from './loan_application.js';
import Status from './status.js';

// Setup Associations
export const setupAssociations = () => {
  Lender.hasMany(Lender_Loan_Rates, { foreignKey: 'lender_id', as: 'loanRates' });
  Lender_Loan_Rates.belongsTo(Lender, { foreignKey: 'lender_id' });

  Loan_type.hasMany(Lender_Loan_Rates, { foreignKey: 'loan_type_id', as: 'loanRates' });
  Lender_Loan_Rates.belongsTo(Loan_type, { foreignKey: 'loan_type_id', as: 'type' });

  State.hasMany(District, { foreignKey: 'state_id' });
  District.belongsTo(State, { foreignKey: 'state_id' });

  District.hasMany(City, { foreignKey: 'district_id' });
  City.belongsTo(District, { foreignKey: 'district_id' });

  City.hasMany(Pincode, { foreignKey: 'city_id' });
  Pincode.belongsTo(City, { foreignKey: 'city_id' });

  Borrower.belongsTo(Pincode, {foreignKey: 'pincode_id'});
  Pincode.hasMany(Borrower, {foreignKey: 'pincode_id'});

  User.belongsTo(Role, { foreignKey: 'role_id'});
  Role.hasMany(User, {foreignKey: 'role_id'});

  // Borrower to User Association
  Borrower.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasOne(Borrower, { foreignKey: 'user_id', as: 'borrower' });

  // Loan_Application Associations
  User.hasMany(Loan_Application, { foreignKey: 'user_id' });
  Loan_Application.belongsTo(User, { foreignKey: 'user_id' });

  Lender.hasMany(Loan_Application, { foreignKey: 'lender_id' });
  Loan_Application.belongsTo(Lender, { foreignKey: 'lender_id' });

  Loan_type.hasMany(Loan_Application, { foreignKey: 'loan_type_id' });
  Loan_Application.belongsTo(Loan_type, { foreignKey: 'loan_type_id' });

  Status.hasMany(Loan_Application, { foreignKey: 'status_id' });
  Loan_Application.belongsTo(Status, { foreignKey: 'status_id' });

  // Explicit alias for Loan_Application → Loan_type (used in broker referral queries)
  Loan_Application.belongsTo(Loan_type, { foreignKey: 'loan_type_id', as: 'loanType' });
  Loan_type.hasMany(Loan_Application, { foreignKey: 'loan_type_id', as: 'applications' });
};
