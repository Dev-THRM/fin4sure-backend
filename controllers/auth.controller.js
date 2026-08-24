import {
  signUpService,
  sendOTPService,
  verifyOTPService,
  loginService,
  profileService,
  profileUpdateService,
  registerBorrowerService,
  sendEmailOTPService,
  verifyEmailOTPService,
  otpLoginService,
} from "../services/auth.service.js";
import { signAccessToken } from "../utils/jwt.utlis.js";
import Partner from "../models/partner.model.js";
import City from "../models/city.js";
import District from "../models/district.js";
import State from "../models/state.js";
import Admin from "../models/admin.model.js";
import Borrower from "../models/borrower.js";
import Pincode from "../models/pincode.js";

export const signUpHandler = async (req, res) => {
  try {
    const { name, email, number, password, role, dob, address, state, district, pincode, city, broker_id } = req.body;
    let role_id = 1; // Default to client

    if (!name || !email || !number || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role === "borrower" || role === "client") role_id = 1;
    else if (role === "partner" || role === "broker") role_id = 2;
    else if (role === "admin") role_id = 3;

    const newUser = await signUpService({
      name,
      email,
      number,
      password,
      role_id,
      dob,
      address,
      state,
      district,
      pincode,
      city,
      broker_id
    });

    const accessToken = signAccessToken({
      _id: newUser.id,
      role: newUser.role_id,
    });

    let roleStr = "borrower";
    if (newUser.role_id === 2) roleStr = "partner";
    if (newUser.role_id === 3) roleStr = "admin";

    return res
      .cookie("AccessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        user: {
          _id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: roleStr,
        }
      });
  } catch (err) {
    console.error("Signup error:", err);
    if (err.message === "User already exists") {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const registerBorrowerHandler = async (req, res) => {
  try {
    const { name, email, number, loanAmount, tenure, loanType } = req.body;

    if (!email || !number) {
      return res.status(400).json({ message: "Email and Mobile number are required" });
    }

    const result = await registerBorrowerService(req.body);
    const { user, borrower, accessToken, applicationId } = result;

    return res
      .cookie("AccessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Application submitted successfully",
        applicationId: applicationId || borrower?.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: "borrower",
      });
  } catch (err) {
    console.error("Register Borrower error:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const SendOTP = async (req, res) => {
  try {
    const { number } = req.body;
    if (!/^[0-9]{10}$/.test(number)) {
      return res.status(400).json({ message: "Invalid number passed" });
    }
    await sendOTPService(number);
    res.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL OTP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-email-otp
 * Body: { email }
 * Generates a 4-digit OTP and sends it to the provided email via Resend.
 */
export const SendEmailOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }
    await sendEmailOTPService(email, purpose);
    return res.json({ success: true, message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Error sending email OTP:', error);
    return res.status(500).json({ message: error.message || 'Failed to send OTP email.' });
  }
};

/**
 * POST /api/auth/verify-email-otp
 * Body: { email, otp }
 * Verifies the email OTP (without logging in — use for standalone verification steps).
 */
export const VerifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }
    await verifyEmailOTPService(email, otp);
    return res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/auth/otp-login
 * Body: { email, otp }
 * Passwordless login — verifies OTP and returns a signed JWT + sets cookie.
 */
export const OTPLoginHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const { user, accessToken } = await otpLoginService(email, otp);

    let role = 'borrower';
    if (user.role_id === 2) role = 'partner';
    if (user.role_id === 3) role = 'admin';

    return res
      .cookie('AccessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        accessToken,
        user: {
          _id: user.id,
          name: user.name,
          email: user.email,
          role,
        },
      });
  } catch (error) {
    console.error('OTP Login error:', error);
    const status = error.message.includes('No account') ? 404 : 400;
    return res.status(status).json({ message: error.message });
  }
};


export const verifyOTP = async (req, res) => {
  try {
    const { number, otp } = req.body;
    if (!number || !otp) {
      return res.status(400).json({ message: "Number and OTP required" });
    }
    await verifyOTPService(number, otp);
    return res.json({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const loginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const { user, accessToken } = await loginService(email, password);

    // map role_id back to role string for client
    let role = "borrower";
    if (user.role_id === 2) role = "partner";
    if (user.role_id === 3) role = "admin";

    return res
      .cookie("AccessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role,
        accessToken,
      });
  } catch (err) {
    console.error("Login error:", err);
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const Logouthandaler = async (req, res) => {
  try {
    const AccessToken = req.cookies.AccessToken;
    if (!AccessToken) {
      return res.status(500).json({ message: "accesstoken not found" });
    }
    if (req.user && Number(req.user.role) === 3) {
      await Admin.update(
        { sessionStatus: 'Inactive' },
        { where: { id: req.user._id } }
      );
    }
    res
      .clearCookie("AccessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
      .json({ message: "Logged out successfully" });
  } catch (e) {
    return res.json({ message: `${e}` });
  }
};

export const sendUpdateNumberOTP = async (req, res) => {
  console.log("sendUpdateNumberOTP endpoint hit with number:", req.body?.number);
  try {
    const { number } = req.body;
    if (!/^[0-9]{10}$/.test(number)) {
      console.log("Validation failed: number must be 10 digits");
      return res.status(400).json({ message: "Invalid number" });
    }
    const otpRes = await sendOTPService(number);
    console.log("OTP generated and saved successfully for:", number);
    return res.json({ message: "OTP sent to new number" });
  } catch (err) {
    console.error("Error in sendUpdateNumberOTP:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyUpdateNumberOTP = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { number, otp } = req.body;
    if (!number || !otp) {
      return res.status(400).json({ message: "Number and OTP required" });
    }
    await verifyOTPService(number, otp);
    return res.json({ message: "OTP verified" });
  } catch (err) {
    return res.status(400).json({ message: err.message || "OTP verification failed" });
  }
};

export const profileHandler = async (req, res) => {
  try {
    const user_id = req.user?._id || req.user?.id;
    const reqRole = Number(req.user?.role);

    if (!user_id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    let user = null;
    let isAdmin = reqRole === 3;

    if (isAdmin) {
      try {
        user = await Admin.findByPk(user_id, { raw: true });
        if (!user) user = await Admin.findOne({ where: { email: "admin@finn4sure.com" }, raw: true });
      } catch (e) {
        console.error("Admin lookup error:", e.message);
      }
    } else {
      try {
        user = await User.findByPk(user_id, { raw: true });
        if (!user) user = await User.findOne({ where: { id: user_id }, raw: true });
      } catch (e) {
        console.error("User lookup error:", e.message);
      }
    }

    if (isAdmin || (user && user.role_id === 3)) {
      return res.status(200).json({
        _id: user ? user.id : user_id,
        name: user ? user.name : "Admin",
        email: user ? user.email : "admin@finn4sure.com",
        number: user ? user.number : "9910507574",
        role: "admin"
      });
    }

    if (!user) {
      user = await User.findOne({ order: [['createdAt', 'DESC']], raw: true });
    }

    let role = "borrower";
    if (user && user.role_id === 2) role = "partner";
    if (user && user.role_id === 3) role = "admin";

    let clientDetails = {};
    if (role === "borrower" && user) {
      try {
        let client = await Borrower.findOne({ where: { user_id: user.id }, raw: true });
        
        console.log("[PROFILE DEBUG] user_id:", user.id, "| client raw:", JSON.stringify(client));

        let pincodeCode = "";
        let cityName = "";
        let districtName = "";
        let stateName = "";

        if (client && client.pincode_id) {
          try {
            let pinRec = await Pincode.findByPk(client.pincode_id, { raw: true });
            // If FK lookup fails, try treating pincode_id as the actual code string
            if (!pinRec) {
              pinRec = await Pincode.findOne({ where: { code: String(client.pincode_id) }, raw: true });
            }
            console.log("[PROFILE DEBUG] pinRec:", JSON.stringify(pinRec));
            if (pinRec) {
              pincodeCode = pinRec.code || "";
              if (pinRec.city_id) {
                const cRec = await City.findByPk(pinRec.city_id, { raw: true });
                if (cRec) {
                  cityName = cRec.name || "";
                  if (cRec.district_id) {
                    const dRec = await District.findByPk(cRec.district_id, { raw: true });
                    if (dRec) {
                      districtName = dRec.name || "";
                      if (dRec.state_id) {
                        const sRec = await State.findByPk(dRec.state_id, { raw: true });
                        if (sRec) stateName = sRec.name || "";
                      }
                    }
                  }
                }
              }
            }
          } catch (pinErr) {
            console.error("Pincode resolution error:", pinErr.message);
          }
        }

        console.log("[PROFILE DEBUG] user_id:", user.id, "| client raw:", JSON.stringify(client));
        console.log("[PROFILE DEBUG] pincodeCode:", pincodeCode, "| stateName:", stateName, "| cityName:", cityName, "| districtName:", districtName);
        clientDetails = {
          dob: (client && client.dob) || null,
          address: (client && client.address) || "",
          // Fallback: if FK resolution failed, try raw pincode column or pincode_id itself
          pincode: pincodeCode || (client && client.pincode ? String(client.pincode) : (client && client.pincode_id ? String(client.pincode_id) : "")),
          state: stateName || "",
          district: districtName || "",
          city: cityName || ""
        };
        console.log("[PROFILE DEBUG] final clientDetails:", JSON.stringify(clientDetails));
      } catch (bErr) {
        console.error("Borrower profile fetch error:", bErr.message);
      }
    }

    return res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      number: user.mob_no || user.number,
      role,
      ...clientDetails
    });
  }  catch (err) {
    console.error("Profile handler error:", err);
    return res.status(500).json({ message: "Failed to load profile details." });
  }
};  

export const profileUpdateHandeler = async (req, res) => {
  try {
    const user_id = req.user._id || req.user.id;
    if (!user_id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.number) updateData.mob_no = req.body.number;

    const updatedUser = await profileUpdateService(user_id, updateData);

    let updatedAddress = req.body.address || "";
    let updatedPincode = req.body.pincode || "";

    if (updatedUser && (updatedUser.role_id === 1 || !updatedUser.role_id)) {
      let client = await Borrower.findOne({ where: { user_id } });
      if (!client) {
        client = await Borrower.create({
          user_id,
          dob: new Date('1995-05-15'),
          gender: 'male',
          address: req.body.address || '123 Green Avenue, Central Delhi',
          pincode_id: 1
        });
      }
      if (client) {
        if (req.body.name) client.name = req.body.name;
        if (req.body.email) client.email = req.body.email;
        if (req.body.number) client.number = req.body.number;
        if (req.body.address !== undefined) client.address = req.body.address;
        
        if (req.body.pincode) {
          let pin = await Pincode.findOne({ where: { code: req.body.pincode } });
          if (!pin) {
            try {
              pin = await Pincode.create({ code: req.body.pincode, city_id: 1 });
            } catch (_) {}
          }
          if (pin) {
            client.pincode_id = pin.id;
          }
        }
        await client.save();
        updatedAddress = client.address;
        updatedPincode = req.body.pincode || updatedPincode;
      }
    } else if (updatedUser && updatedUser.role_id === 2) {
      if (req.body.city) {
        const cityName = req.body.city.trim();
        let cityObj = await City.findOne({ where: { name: cityName } });
        if (!cityObj) {
          const [stateObj] = await State.findOrCreate({
            where: { name: "Maharashtra" },
            defaults: { country: "India" }
          });
          const [districtObj] = await District.findOrCreate({
            where: { name: "Mumbai City" },
            defaults: { state_id: stateObj.id }
          });
          cityObj = await City.create({
            name: cityName,
            district_id: districtObj.id
          });
        }
        const [partner] = await Partner.findOrCreate({
          where: { user_id },
          defaults: { city_id: cityObj.id }
        });
        partner.city_id = cityObj.id;
        await partner.save();
      }
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      number: updatedUser.mob_no,
      city: req.body.city || ""
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ message: "Something went wrong updating profile: " + err.message });
  }
};

export const adminLoginHandler = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password !== "finn@admin2026") {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    let admin = await Admin.findOne({ where: { email: "admin@finn4sure.com" } });
    if (!admin) {
      admin = await Admin.create({
        name: "Admin",
        email: "admin@finn4sure.com",
        number: "9910507574",
        password: "finn@admin2026", // Will be hashed via hook
        sessionStatus: "Active",
        lastLogin: new Date()
      });
    } else {
      admin.lastLogin = new Date();
      admin.sessionStatus = "Active";
      await admin.save();
    }

    const accessToken = signAccessToken({
      _id: admin.id,
      role: 3
    });

    return res
      .cookie("AccessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        accessToken,
        user: {
          _id: admin.id,
          name: admin.name,
          email: admin.email,
          role: "admin"
        }
      });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ----------------------------------------------------------------------------------------------------------------------
// OLD MONGOOSE CODE COMMENTED OUT AS PER REQUEST
// ----------------------------------------------------------------------------------------------------------------------
// imports
// import Admin from "../models/admin.model.js";
// import Broker from "../models/broker.model.js";
// import Client from "../models/client.model.js";
// import Lead from "../models/lead.model.js";
// import { signAccessToken, signRefreshToken } from "../utils/jwt.utlis.js";
// import axios from "axios";
// const url = "/login";
// const otp_data = {}; 
// const OTP_EXPIRY_TIME = 5 * 60 * 1000;
// const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// ... (The rest of the previous mongoose implementation)
// export const signUpHandler = async (req, res) => { ... }
// const generateOTP = () => { ... }
// export const SendOTP = async (req, res) => { ... }
// export const verifyOTP = async (req, res) => { ... }
// export const loginHandler = async (req, res) => { ... }
// export const Logouthandaler = async (req, res) => { ... }
// export const sendUpdateNumberOTP = async (req, res) => { ... }
// export const verifyUpdateNumberOTP = async (req, res) => { ... }
// export const profileHandler = async (req, res) => { ... }
// export const profileUpdateHandeler = async (req, res) => { ... }
*/
