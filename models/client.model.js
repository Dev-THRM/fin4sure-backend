import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcrypt';

const Client = sequelize.define('Client', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  pan_hash: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  pan_encrypted: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  broker_id: {
    type: DataTypes.STRING,
    defaultValue: 'self',
  },
  dob: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (client) => {
      if (client.password) {
        client.password = await bcrypt.hash(client.password, 10);
      }
    },
    beforeUpdate: async (client) => {
      if (client.changed('password')) {
        client.password = await bcrypt.hash(client.password, 10);
      }
    },
  },
});

Client.prototype.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default Client;
