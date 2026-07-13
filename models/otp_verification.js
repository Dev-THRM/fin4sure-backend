import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Otp_Verification extends Model {
    static associate(models) {
      // define association here
    }
  }
  Otp_Verification.init({
    mob_no: DataTypes.STRING,
    otp_hash: DataTypes.STRING,
    purpose: DataTypes.STRING,
    expires_at: DataTypes.DATE,
    verified_at: DataTypes.DATE,
    attempts: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Otp_Verification',
  });
  return Otp_Verification;
};