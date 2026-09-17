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
  const cleanMobile = (number || "").trim();
  const hashedPassword = await bcrypt.hash(password, 10);

  const userByEmail = await User.findOne({ where: { email: normalizedEmail } });
  if (userByEmail) {
    if (role_id === 2) {
      userByEmail.role_id = 2;
      userByEmail.password_hash = hashedPassword;
      userByEmail.name = name;
      userByEmail.status = 'active';
      if (cleanMobile) userByEmail.mob_no = cleanMobile;
      await userByEmail.save();

      const cityName = (city || "Mumbai").trim();
      const districtName = (district || cityName || "Mumbai City").trim();
      const stateName = (state || "Maharashtra").trim();

      const [stateObj] = await State.findOrCreate({
        where: { name: stateName },
        defaults: { country: "India" },
      });

      const [districtObj] = await District.findOrCreate({
        where: { name: districtName },
        defaults: { state_id: stateObj.id },
      });

      const [cityObj] = await City.findOrCreate({
        where: { name: cityName },
        defaults: { district_id: districtObj.id },
      });

      const existingPartner = await Partner.findOne({ where: { user_id: userByEmail.id } });
      if (!existingPartner) {
        await Partner.create({
          user_id: userByEmail.id,
          city_id: cityObj ? cityObj.id : null,
        });
      } else if (cityObj && existingPartner.city_id !== cityObj.id) {
        existingPartner.city_id = cityObj.id;
        await existingPartner.save();
      }

      return userByEmail;
    }
    throw new Error("This email is already registered. Please sign in instead.");
  }

  const userByMobile = cleanMobile ? await User.findOne({ where: { mob_no: cleanMobile } }) : null;
  if (userByMobile) {
    if (role_id === 2) {
      userByMobile.role_id = 2;
      userByMobile.password_hash = hashedPassword;
      userByMobile.name = name;
      userByMobile.email = normalizedEmail;
      userByMobile.status = 'active';
      await userByMobile.save();

      const cityName = (city || "Mumbai").trim();
      const districtName = (district || cityName || "Mumbai City").trim();
      const stateName = (state || "Maharashtra").trim();

      const [stateObj] = await State.findOrCreate({
        where: { name: stateName },
        defaults: { country: "India" },
      });

      const [districtObj] = await District.findOrCreate({
        where: { name: districtName },
        defaults: { state_id: stateObj.id },
      });

      const [cityObj] = await City.findOrCreate({
        where: { name: cityName },
        defaults: { district_id: districtObj.id },
      });

      const existingPartner = await Partner.findOne({ where: { user_id: userByMobile.id } });
      if (!existingPartner) {
        await Partner.create({
          user_id: userByMobile.id,
          city_id: cityObj ? cityObj.id : null,
        });
      } else if (cityObj && existingPartner.city_id !== cityObj.id) {
        existingPartner.city_id = cityObj.id;
        await existingPartner.save();
      }

      return userByMobile;
    }
    throw new Error("This mobile number is already registered. Please sign in instead.");
  }

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    mob_no: cleanMobile,
    password_hash: hashedPassword,
    role_id,
    status: 'active'
  });

  if (role_id === 2) {
    // Partner / Broker role
    const cityName = (city || "Mumbai").trim();
    const districtName = (district || cityName || "Mumbai City").trim();
    const stateName = (state || "Maharashtra").trim();

    // 1. Find or create State
    const [stateObj] = await State.findOrCreate({
      where: { name: stateName },
      defaults: { country: "India" },
    });

    // 2. Find or create District
    const [districtObj] = await District.findOrCreate({
      where: { name: districtName },
      defaults: { state_id: stateObj.id },
    });

    // 3. Find or create City
    const [cityObj] = await City.findOrCreate({
      where: { name: cityName },
      defaults: { district_id: districtObj.id },
    });

    // 4. Partner table schema: id, user_id, city_id, createdAt, updatedAt
    await Partner.create({
      user_id: newUser.id,
      city_id: cityObj ? cityObj.id : null,
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
  const cleanMobile = (number || "").trim();

  // 1. Check if email is already registered
  const existingUserByEmail = await User.findOne({
    where: { email: normalizedEmail }
  });

  // 2. Check if mobile is already registered
  const existingUserByMobile = cleanMobile ? await User.findOne({
    where: { mob_no: cleanMobile }
  }) : null;

  // If email is already registered to a different user, block registration!
  if (existingUserByEmail && existingUserByMobile && existingUserByEmail.id !== existingUserByMobile.id) {
    throw new Error("This email is already registered to another account. Please use your registered phone number or log in.");
  }

  if (existingUserByEmail && !existingUserByMobile) {
    if (existingUserByEmail.mob_no && cleanMobile && existingUserByEmail.mob_no !== cleanMobile) {
      throw new Error("This email is already registered to another account. Please use your registered phone number or log in.");
    }
  }

  if (!existingUserByEmail && existingUserByMobile) {
    if (existingUserByMobile.email && existingUserByMobile.email !== normalizedEmail) {
      throw new Error("This mobile number is already registered with a different email address.");
    }
  }

  let existingUser = existingUserByEmail || existingUserByMobile;

  const transaction = await sequelize.transaction();

  try {
    let targetUser = existingUser;
    if (!targetUser) {
      const hashedPassword = await bcrypt.hash(password || "Pass@1234", 10);
      targetUser = await User.create({
        name: name || "Borrower",
        email: normalizedEmail,
        mob_no: cleanMobile,
        password_hash: hashedPassword,
        role_id: 1, // Borrower role
        status: 'active'
      }, { transaction });
    } else if (name && !existingUser.name) {
      await existingUser.update({ name }, { transaction });
    }

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

export const sendEmailOTPService = async (email, purposeStr = 'email_login', mobileNumber = null) => {
  const normalizedEmail = email.toLowerCase().trim();

  // If this is for login, make sure the user actually exists
  if (purposeStr === 'login' || purposeStr === 'email_login') {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new Error('No account found with this email address.');
    }
    if (user.status && user.status.toLowerCase() === 'inactive') {
      if (user.role_id === 2) {
        throw new Error('Inactive partner');
      } else {
        throw new Error('Account inactive');
      }
    }
  }

  // If this is for general signup, disallow if email is already registered
  if (purposeStr === 'signup') {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (user) {
      throw new Error('This email address is already registered. Please sign in instead.');
    }
  }

  // If this is for borrower registration onboarding with a mobile number,
  // verify if the email is already registered to another mobile number
  if (purposeStr === 'registration' && mobileNumber) {
    const cleanMobile = mobileNumber.trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing && existing.mob_no && existing.mob_no !== cleanMobile) {
      throw new Error('This email address is already registered to another account. Please use your registered phone number or log in.');
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

export const verifyEmailOTPService = async (email, otp, shouldDestroy = true) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Dev bypass: '123456' or '1234' skips real verification
  if (otp === '123456' || otp === '1234') {
    const bypass = await OtpVerification.findOne({
      where: { email: normalizedEmail },
      order: [['createdAt', 'DESC']],
    });
    if (bypass && shouldDestroy) await bypass.destroy();
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

  if (shouldDestroy) {
    await record.destroy();
  } else {
    await record.update({ verified_at: new Date() });
  }

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

  if (user.status && user.status.toLowerCase() === 'inactive') {
    if (user.role_id === 2) {
      throw new Error('Inactive partner');
    } else {
      throw new Error('Account inactive');
    }
  }

  if (expectedRole) {
    const roleId = (expectedRole === 'partner' || expectedRole === 'broker') ? 2 : (expectedRole === 'admin' ? 3 : 1);
    if (user.role_id !== roleId) {
      if (roleId === 2) {
        const partner = await Partner.findOne({ where: { user_id: user.id } });
        if (partner) {
          user.role_id = 2;
          await user.save();
        } else {
          throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
        }
      } else {
        throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
      }
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

  if (user.status && user.status.toLowerCase() === 'inactive') {
    if (user.role_id === 2) {
      throw new Error('Inactive partner');
    } else {
      throw new Error('Account inactive');
    }
  }

  if (expectedRole) {
    const roleId = (expectedRole === 'partner' || expectedRole === 'broker') ? 2 : (expectedRole === 'admin' ? 3 : 1);
    if (user.role_id !== roleId) {
      if (roleId === 2) {
        const partner = await Partner.findOne({ where: { user_id: user.id } });
        if (partner) {
          user.role_id = 2;
          await user.save();
        } else {
          throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
        }
      } else {
        throw new Error(`This user is not a ${expectedRole}, do you want to register?`);
      }
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
  
  // 1. Verify OTP first (and delete it)
  await verifyEmailOTPService(normalizedEmail, otp, true);

  // 2. Find user
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) throw new Error("User not found");

  // 3. Update password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password_hash = hashedPassword;
  await user.save();

  // 4. Generate token so client can auto-login
  const accessToken = signAccessToken({
    _id: user.id,
    role: user.role_id,
  });

  let role = 'borrower';
  if (user.role_id === 2) role = 'partner';
  if (user.role_id === 3) role = 'admin';

  return {
    success: true,
    message: "Password reset successfully.",
    accessToken,
    user: {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      number: user.mob_no || user.number,
      mob_no: user.mob_no || user.number,
      role,
    }
  };
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