import bcrypt from "bcrypt";
import { sequelize } from "../config/db.js";
import { DataTypes, Op } from "sequelize";
import { generateOTP } from "../utils/otp.js";
import { signAccessToken } from "../utils/jwt.utlis.js";
import { sendOtpEmail } from "../utils/email.js";

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

  let existingUser = await User.findOne({
    where: {
      [Op.or]: [{ mob_no: number }, { email: normalizedEmail }]
    }
  });

  const transaction = await sequelize.transaction();

  try {
    if (existingUser) {
      throw new Error("User already exists with this email or mobile number.");
    }

    const hashedPassword = await bcrypt.hash(password || "Pass@1234", 10);
    const targetUser = await User.create({
      name,
      email: normalizedEmail,
      mob_no: number,
      password_hash: hashedPassword,
      role_id: 1, // Borrower role
      status: 'active'
    }, { transaction });

    let pincodeRecord = null;
    if (pincode) {
      const stateName = (state || "Unknown State").trim();
      const districtName = (district || "Unknown District").trim();
      const cityName = (data.city || "Unknown City").trim();
      
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
        where: { name: cityName },
        defaults: { district_id: districtObj.id },
        transaction
      });

      pincodeRecord = await Pincode.findOne({ where: { code: pincode, city_id: cityObj.id }, transaction });
      if (!pincodeRecord) {
        pincodeRecord = await Pincode.create({
          code: pincode,
          city_id: cityObj.id
        }, { transaction });
      }
    }

    let targetBorrower = await Borrower.findOne({ where: { user_id: targetUser.id }, transaction });
    if (!targetBorrower) {
      if (!pincodeRecord) {
        pincodeRecord = await Pincode.findOne({ transaction });
      }
      targetBorrower = await Borrower.create({
        user_id: targetUser.id,
        dob: dob ? new Date(dob) : null,
        gender: gender || null,
        address: address || "",
        pincode_id: pincodeRecord ? pincodeRecord.id : null,
        profile_status: 'Active'
      }, { transaction });
    }

    let loanTypeId = 1;
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

    let applicationNo = 10000;
    const maxAppNo = await Loan_Application.max('application_no', { transaction });
    if (maxAppNo && maxAppNo >= 10000) {
      applicationNo = maxAppNo + 1;
    }

    const newLoanApp = await Loan_Application.create({
      application_no: applicationNo,
      borrower_id: targetBorrower.id,
      loan_type_id: loanTypeId,
      loan_amount: loanAmount || 0,
      loan_purpose: loanPurpose || "Loan Application",
      tenure: tenure || 12,
      status_id: 2, // Applied complete -> Current stage is Docs (ID: 2)
      partner_id: partnerIdVal,
      client_preference: partnerIdVal ? 'partner_routing' : null
    }, { transaction });

    // Handle Lender Applications for multiple selected lenders
    if (selectedLenders && Array.isArray(selectedLenders) && selectedLenders.length > 0 && loanTypeId) {
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
      _id: targetUser.id,
      role: targetUser.role_id,
    });

    return {
      user: targetUser,
      borrower: targetBorrower,
      loanApplication: newLoanApp,
      accessToken,
      applicationId: newLoanApp.id
    };
  } catch (error) {
    await transaction.rollback();
    console.error("registerBorrower error:", error);
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

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL OTP SERVICES  (uses Resend; mob_no column left untouched for mobile OTP)
// ─────────────────────────────────────────────────────────────────────────────

export const sendEmailOTPService = async (email, purposeStr = 'email_login') => {
  const normalizedEmail = email.toLowerCase().trim();

  // If this is for login, make sure the user actually exists
  if (purposeStr === 'login') {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new Error('No account found with this email address.');
    }
  }

  const otp = generateOTP();                         // 4-digit OTP from utils/otp.js

  // Delete any previous unused OTPs for this email to keep the table clean
  await OtpVerification.destroy({ where: { email: normalizedEmail } });

  await OtpVerification.create({
    email: normalizedEmail,
    mob_no: null,                                    // Not used in email flow
    otp_hash: otp,
    purpose: 'email_login',
    expires_at: new Date(Date.now() + OTP_EXPIRY_TIME),
    attempts: 0,
  });

  await sendOtpEmail(normalizedEmail, otp);

  return { success: true };
};

export const verifyEmailOTPService = async (email, otp) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Dev bypass: '123456' or '1234' skips real verification
  if (otp === '123456' || otp === '1234') {
    const bypass = await OtpVerification.findOne({
      where: { email: normalizedEmail },
      order: [['createdAt', 'DESC']],
    });
    if (bypass) await bypass.destroy();
    return true;
  }

  const record = await OtpVerification.findOne({
    where: { email: normalizedEmail },
    order: [['createdAt', 'DESC']],
  });

  if (!record) throw new Error('OTP not found. Please request a new one.');

  if (new Date() > new Date(record.expires_at)) {
    await record.destroy();
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (record.otp_hash !== otp) {
    // Increment attempt counter
    await record.increment('attempts');
    throw new Error('Invalid OTP. Please try again.');
  }

  await record.destroy();
  return true;
};

/**
 * Passwordless login via email OTP.
 * Verifies OTP then returns a signed access token — no password needed.
 */
export const otpLoginService = async (email, otp, expectedRole) => {
  await verifyEmailOTPService(email, otp);

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error('No account found with this email address.');
  }

  if (expectedRole) {
    const roleId = expectedRole === 'partner' ? 2 : (expectedRole === 'admin' ? 3 : 1);
    if (user.role_id !== roleId) {
      throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
    }
  }

  const accessToken = signAccessToken({
    _id: user.id,
    role: user.role_id,
  });

  return { user, accessToken };
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

export const loginService = async (email, password, expectedRole) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (expectedRole) {
    const roleId = expectedRole === 'partner' ? 2 : (expectedRole === 'admin' ? 3 : 1);
    if (user.role_id !== roleId) {
      throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
    }
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

export const resetPasswordService = async (email, otp, newPassword) => {
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Verify OTP first
  const otpRecord = await OtpVerification.findOne({
    where: { identifier: normalizedEmail, purpose: 'login' },
    order: [['createdAt', 'DESC']]
  });

  if (!otpRecord) throw new Error("No OTP found. Please request a new one.");
  
  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) throw new Error("Invalid OTP");

  // 2. Find user
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) throw new Error("User not found");

  // 3. Update password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  user.password_hash = hashedPassword;
  await user.save();

  // 4. Delete OTP so it cannot be reused
  await OtpVerification.destroy({ where: { identifier: normalizedEmail, purpose: 'login' } });

  return { message: "Password reset successfully." };
};

export const changePasswordService = async (userId, oldPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  if (user.password_hash) {
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) throw new Error("Incorrect current password");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  user.password_hash = hashedPassword;
  await user.save();

  return { message: "Password updated successfully." };
};