import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcrypt';

const Broker = sequelize.define('Broker', {
  brokerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
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
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  clients: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  dob: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  district: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  statusUpdatedAt: {
    type: DataTypes.DATE,
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (broker) => {
      if (broker.password) {
        broker.password = await bcrypt.hash(broker.password, 10);
      }
    },
    beforeUpdate: async (broker) => {
      if (broker.changed('password')) {
        broker.password = await bcrypt.hash(broker.password, 10);
      }
    },
  },
});

Broker.prototype.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default Broker;
