'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Borrower extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Borrower.init({
    user_id: DataTypes.INTEGER,
    dob: DataTypes.DATE,
    gender: DataTypes.ENUM('male', 'female', 'other'),
    address: DataTypes.STRING,
    pincode_id: DataTypes.INTEGER,
    profile_status: DataTypes.ENUM('Completed', 'Incomplete', 'Under Review', 'Rejected')
  }, {
    sequelize,
    modelName: 'Borrower',
  });
  return Borrower;
};