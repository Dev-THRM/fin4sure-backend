import bcrypt from "bcrypt";
import { sequelize } from "../config/db.js";
import { DataTypes, Op } from "sequelize";
import axios from "axios";
import { generateOTP } from "../utils/otp.js";
import { signAccessToken } from "../utils/jwt.utlis.js";

import UserInit from "../models/user.js";
import OtpVerificationInit from "../models/otp_verification.js";
import City from "../models/city.model.js";
import Partner from "../models/partner.model.js";
import Client from "../models/client.model.js";

const User = UserInit(sequelize, DataTypes);
const OtpVerification = OtpVerificationInit(sequelize, DataTypes);

const OTP_EXPIRY_TIME = 5 * 60 * 1000; 

export const signUpService = async (data) => {
  const { name, email, number, password, role_id, dob, address, state, district, pincode, city } = data;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ mob_no: number }, { email: normalizedEmail }]
    }
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    mob_no: number,
    password_hash: hashedPassword,
    role_id,
    status: 'active'
  });

  if (role_id === 2) {
    // Partner / Broker role
    const cityName = (city || district || address || "Mumbai").trim();
    const [cityObj] = await City.findOrCreate({
      where: { name: cityName },
      defaults: {
        city_id: "CTY" + Math.floor(100000 + Math.random() * 900000)
      }
    });
    await Partner.create({
      user_id: newUser.id,
      city_id: cityObj.id
    });
  } else if (role_id === 1) {
    // Borrower / Client role
    await Client.create({
      id: newUser.id,
      name,
      email: normalizedEmail,
      number,
      password: password, // hooks will hash it
      dob: dob || null,
      address: address || null,
      pincode: pincode || null,
      state: state || null,
      district: district || null,
    });
  }

  return newUser;
};

export const sendOTPService = async (number) => {
  const otp = generateOTP();

  await OtpVerification.create({
    mob_no: number,
    otp_hash: otp, 
    purpose: 'login_or_signup',
    expires_at: new Date(Date.now() + OTP_EXPIRY_TIME),
  });

  // const whatsapp_url = `https://graph.facebook.com/v20.0/${process.env.MOBILE_ID}/messages`;
  // 
  // await axios.post(
  //   whatsapp_url,
  //   {
  //     messaging_product: "whatsapp",
  //     to: `91${number}`,
  //     type: "template",
  //     template: {
  //       name: "delivery",
  //       language: { code: "en" },
  //       components: [
  //         {
  //           type: "body",
  //           parameters: [{ type: "text", text: otp }],
  //         },
  //         {
  //           type: "button",
  //           sub_type: "url",
  //           index: 0,
  //           parameters: [{ type: "text", text: "otp" }],
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     headers: {
  //       Authorization: `Bearer ${process.env.TOKENS}`,
  //       "Content-Type": "application/json",
  //     },
  //   }
  // );

  // LOCAL TESTING ONLY: Log the OTP to the console
  console.log(`\n==========================================`);
  console.log(`🔑 LOCAL TESTING OTP FOR ${number}: ${otp} 🔑`);
  console.log(`==========================================\n`);

  return { success: true };
};

export const verifyOTPService = async (number, otp) => {
  const record = await OtpVerification.findOne({
    where: { mob_no: number },
    order: [['createdAt', 'DESC']]
  });

  if (!record) {
    throw new Error("OTP not found");
  }

  if (new Date() > new Date(record.expires_at)) {
    throw new Error("OTP expired");
  }

  if (record.otp_hash !== otp) {
    throw new Error("Invalid OTP");
  }

  await record.destroy();

  return true;
};

export const loginService = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const accessToken = signAccessToken({
    _id: user.id,
    role: user.role_id, 
  });

  return { user, accessToken };
};

export const profileService = async (userId) => {
  const user = await User.findByPk(userId, { attributes: { exclude: ['password_hash'] } });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export const profileUpdateService = async (userId, updateData) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
  }

  await user.update(updateData);
  return await User.findByPk(userId, { attributes: { exclude: ['password_hash'] } });
};