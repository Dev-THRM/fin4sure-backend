import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Otp_Verification extends Model {
    static associate(models) {
      // define association here
    }
  }
  Otp_Verification.init({
    mob_no: {
      type: DataTypes.STRING,
      allowNull: true,   // Nullable — set for mobile OTP flow
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,   // Nullable — set for email OTP flow
    },
    otp_hash: DataTypes.STRING,
    purpose: DataTypes.STRING,
    expires_at: DataTypes.DATE,
    verified_at: DataTypes.DATE,
    attempts: DataTypes.INTEGER
  }, {
    sequelize,
    tableName: 'otp_verifications',
    modelName: 'Otp_Verification',
  });
  return Otp_Verification;
};