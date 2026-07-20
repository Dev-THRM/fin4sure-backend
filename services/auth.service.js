import bcrypt from "bcrypt";
import { sequelize } from "../config/db.js";
import { DataTypes, Op } from "sequelize";
import { generateOTP } from "../utils/otp.js";
import { signAccessToken } from "../utils/jwt.utlis.js";

import User from "../models/user.js";
import OtpVerificationInit from "../models/otp_verification.js";
import Borrower from "../models/borrower.js";
import Pincode from "../models/pincode.js";
import Loan_Application from "../models/loan_application.js";
import Loan_type from "../models/loan_type.js";
import Lender_Loan_Rates from "../models/lender_loan_rates.js";
import City from "../models/city.js";
import State from "../models/state.js";
import District from "../models/district.js";
import Partner from "../models/partner.model.js";
import Lender_Application from "../models/lender_application.js";
import Admin from "../models/admin.model.js";

const OtpVerification = OtpVerificationInit(sequelize, DataTypes);

const OTP_EXPIRY_TIME = 5 * 60 * 1000;

export const signUpService = async (data) => {
  const { name, email, number, password, role_id, dob, address, state, district, pincode, city, broker_id } = data;

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
    const cityName = (city || "Mumbai").trim();
    const districtName = (district || "Mumbai City").trim();
    const stateName = (state || "Maharashtra").trim();

    // 1. Find or create State
    const [stateObj] = await State.findOrCreate({
      where: { name: stateName },
      defaults: { country: "India" }
    });

    // 2. Find or create District
    const [districtObj] = await District.findOrCreate({
      where: { name: districtName },
      defaults: { state_id: stateObj.id }
    });

    // 3. Find or create City
    const [cityObj] = await City.findOrCreate({
      where: { name: cityName },
      defaults: { district_id: districtObj.id }
    });

    // 4. Create Partner
    await Partner.create({
      user_id: newUser.id,
      city_id: cityObj.id
    });
  } else if (role_id === 1) {
    // Borrower role (User already created)
    // Borrower profile will be completed during loan application
  }

  return newUser;
};

export const registerBorrowerService = async (data) => {
  const { name, email, number, dob, gender, address, pincode, state, district, password, loanAmount, tenure, loanPurpose, loanType, selectedLenders, broker_id } = data;

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

  const transaction = await sequelize.transaction();

  try {
    console.log('[STEP 1] Creating user...');
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      mob_no: number,
      password_hash: hashedPassword,
      role_id: 1, // Borrower role
      status: 'active'
    }, { transaction });

    let pincodeRecord = await Pincode.findOne({ where: { code: pincode }, transaction });
    if (!pincodeRecord) {
      const stateName = (state || "Unknown State").trim();
      const districtName = (district || "Unknown District").trim();
      
      const [stateObj] = await State.findOrCreate({
        where: { name: stateName },
        defaults: { country: "India" },
        transaction
      });
      
      const [districtObj] = await District.findOrCreate({
        where: { name: districtName },
        defaults: { state_id: stateObj.id },
        transaction
      });
      
      const [cityObj] = await City.findOrCreate({
        where: { name: "Unknown City" },
        defaults: { district_id: districtObj.id },
        transaction
      });

      pincodeRecord = await Pincode.create({
        code: pincode,
        city_id: cityObj.id
      }, { transaction });
    }

    console.log('[STEP 3] Creating borrower...');
    const newBorrower = await Borrower.create({
      user_id: newUser.id,
      dob: new Date(dob),
      gender,
      address,
      pincode_id: pincodeRecord.id,
      profile_status: 'Under Review'
    }, { transaction });



    let loanTypeId = null;
    if (loanType) {
      const typeRecord = await Loan_type.findOne({ where: { short_id: loanType }, transaction });
      if (typeRecord) {
        loanTypeId = typeRecord.id;
      }
    }

    // Look up partner record based on broker_id
    let partnerIdVal = null;
    if (broker_id && broker_id !== "self") {
      const partnerRec = await Partner.findOne({ where: { user_id: Number(broker_id) }, transaction });
      if (partnerRec) {
        partnerIdVal = partnerRec.id;
      }
    }

    console.log('[STEP 4] Creating loan application...');
    const applicationNo = Math.floor(10000 + Math.random() * 90000);

    const newLoanApp = await Loan_Application.create({
      application_no: applicationNo,
      user_id: newUser.id,
      loan_type_id: loanTypeId,
      loan_amount: loanAmount,
      loan_purpose: loanPurpose,
      tenure: tenure,
      status_id: 1, // Default status e.g., 'Under Review'
      partner_id: partnerIdVal,
      client_preference: partnerIdVal ? 'partner_routing' : 'direct_reach'
    }, { transaction });

    // Handle Lender Applications for multiple selected lenders
    if (selectedLenders && selectedLenders.length > 0 && loanTypeId) {
      for (const lender of selectedLenders) {
        const rateObj = await Lender_Loan_Rates.findOne({
          where: { lender_id: lender, loan_type_id: loanTypeId },
          transaction
        });

        if (rateObj) {
          await Lender_Application.create({
            loan_application_id: newLoanApp.id,
            lender_rate_id: rateObj.id,
            status: 'pending'
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    const accessToken = signAccessToken({
      _id: newUser.id,
      role: newUser.role_id,
    });

    return { user: newUser, borrower: newBorrower, accessToken };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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

  // console.log(res.data);
  // LOCAL TESTING ONLY: Log the OTP to the console
  // console.log(`\n==========================================`);
  // console.log(`🔑 LOCAL TESTING OTP FOR ${number}: ${otp} 🔑`);
  // console.log(`==========================================\n`);

  return { success: true };
};

export const verifyOTPService = async (number, otp) => {
  // Allow bypass with '123456' or '1234' for local testing
  if (otp === '123456' || otp === '1234') {
    const record = await OtpVerification.findOne({
      where: { mob_no: number },
      order: [['createdAt', 'DESC']]
    });
    if (record) {
      await record.destroy();
    }
    return true;
  }

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

export const profileService = async (userId, roleId) => {
  if (Number(roleId) === 3) {
    const admin = await Admin.findByPk(userId, { attributes: { exclude: ['password'] } });
    if (!admin) {
      throw new Error("Admin not found");
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role_id: 3,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastLogin: admin.lastLogin,
      sessionStatus: admin.sessionStatus
    };
  }
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