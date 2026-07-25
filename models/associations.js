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
import Partner from './partner.model.js';
import Lender_Application from './lender_application.js';
import Document from './document.js';

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
  Borrower.hasMany(Loan_Application, { foreignKey: 'borrower_id' });
  Loan_Application.belongsTo(Borrower, { foreignKey: 'borrower_id' });

  // Lender <-> Loan_Application direct association
  Lender.hasMany(Loan_Application, { foreignKey: 'lender_id', as: 'lender' });
  Loan_Application.belongsTo(Lender, { foreignKey: 'lender_id', as: 'lender' });

  Loan_Application.hasMany(Lender_Application, { foreignKey: 'loan_application_id' });
  Lender_Application.belongsTo(Loan_Application, { foreignKey: 'loan_application_id' });

  Lender_Loan_Rates.hasMany(Lender_Application, { foreignKey: 'lender_rate_id' });
  Lender_Application.belongsTo(Lender_Loan_Rates, { foreignKey: 'lender_rate_id', as: 'rate' });

  // Status relationship removed for Lender_Application since it uses ENUM now

  Loan_type.hasMany(Loan_Application, { foreignKey: 'loan_type_id' });
  Loan_Application.belongsTo(Loan_type, { foreignKey: 'loan_type_id' });

  Partner.hasMany(Loan_Application, { foreignKey: 'partner_id' });
  Loan_Application.belongsTo(Partner, { foreignKey: 'partner_id' });

  Partner.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasOne(Partner, { foreignKey: 'user_id', as: 'partner' });

  City.hasMany(Partner, { foreignKey: 'city_id', as: 'city' });

  Status.hasMany(Loan_Application, { foreignKey: 'status_id' });
  Loan_Application.belongsTo(Status, { foreignKey: 'status_id' });

  // Explicit alias for Loan_Application → Loan_type (used in broker referral queries)
  Loan_Application.belongsTo(Loan_type, { foreignKey: 'loan_type_id', as: 'loanType' });
  Loan_type.hasMany(Loan_Application, { foreignKey: 'loan_type_id', as: 'applications' });

  Loan_Application.hasMany(Document, { foreignKey: 'loan_application_id' });
  Document.belongsTo(Loan_Application, { foreignKey: 'loan_application_id' });
};
