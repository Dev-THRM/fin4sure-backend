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
};
