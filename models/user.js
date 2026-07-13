import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
      });
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password_hash: DataTypes.STRING,
    mob_no: DataTypes.STRING,
    role_id: DataTypes.INTEGER,
    status: DataTypes.ENUM('active', 'suspended', 'pending verification', 'draft')
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};