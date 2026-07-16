import {
  signUpService,
  sendOTPService,
  verifyOTPService,
  loginService,
  profileService,
  profileUpdateService,
  registerBorrowerService
} from "../services/auth.service.js";
import { signAccessToken } from "../utils/jwt.utlis.js";
import Partner from "../models/partner.model.js";
import City from "../models/city.js";

export const signUpHandler = async (req, res) => {
  try {
    const { name, email, number, password, role, dob, address, state, district, pincode, city } = req.body;
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
      city
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
        secure: false,
        sameSite: "lax",
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
    const { name, email, number, dob, gender, address, pincode, password, loanAmount, tenure, loanPurpose, loanType, selectedLenders } = req.body;

    if (!name || !email || !number || !dob || !gender || !address || !pincode || !password || !loanAmount || !tenure || !loanPurpose || !loanType || !selectedLenders || selectedLenders.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const { user, borrower, accessToken } = await registerBorrowerService(req.body);

    return res
      .cookie("AccessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Borrower created successfully",
        _id: user.id,
        name: user.name,
        email: user.email,
        role: "borrower",
      });
  } catch (err) {
    console.error("Register Borrower error:", err);
    if (err.message === "User already exists") {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
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
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role,
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
    res
      .clearCookie("AccessToken", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .json({ message: "Logged out successfully" });
  } catch (e) {
    return res.json({ message: `${e}` });
  }
};

export const sendUpdateNumberOTP = async (req, res) => {
  try {
    const { number } = req.body;
    if (!/^[0-9]{10}$/.test(number)) {
      return res.status(400).json({ message: "Invalid number" });
    }
    await sendOTPService(number);
    return res.json({ message: "OTP sent to new number" });
  } catch (err) {
    console.error(err);
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
    const user_id = req.user._id;
    if (!user_id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await profileService(user_id);
    
    let role = "borrower";
    if (user.role_id === 2) role = "partner";
    if (user.role_id === 3) role = "admin";

    let city = "";
    if (role === "partner") {
      const partner = await Partner.findOne({
        where: { user_id },
        include: [{ model: City, as: 'city' }]
      });
      if (partner && partner.city) {
        city = partner.city.name;
      }
    }

    return res.json({
      id: user.id,
      role,
      name: user.name,
      email: user.email,
      number: user.mob_no,
      status: user.status,
      city: city || undefined,
      district: city || undefined
    });
  } catch (err) {
    return res.status(404).json({ message: err.message || "User not found" });
  }
};

export const profileUpdateHandeler = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // We expect the payload from req.body to match the new SQL user schema (or map it)
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.number) updateData.mob_no = req.body.number;
    // other fields if needed ...

    const updatedUser = await profileUpdateService(user_id, updateData);
    return res.json(updatedUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
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
