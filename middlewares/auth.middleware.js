import { verifyToken } from "../utils/jwt.utlis.js";
import { sequelize } from "../config/db.js";
import { DataTypes } from "sequelize";
import User from "../models/user.js";
import Admin from "../models/admin.model.js";

export const verifyUser = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.AccessToken; 
    if (!accessToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. Verify and decode JWT (RSA verification)
    const decoded = verifyToken(accessToken);

    // decoded => { _id, role, iat, exp }
    const { _id, role } = decoded;

    // 3. Check for valid role (1=borrower, 2=partner, 3=admin)
    if (![1, 2, 3].includes(Number(role))) {
      return res.status(401).json({ message: "Invalid role" });
    }

    let user = null;
    try {
      if (Number(role) === 3) {
        user = await Admin.findByPk(_id);
        if (!user) user = await User.findByPk(_id);
      } else {
        user = await User.findByPk(_id);
        if (!user) user = await Admin.findByPk(_id);
      }
    } catch (e) {
      console.error("User lookup error in verifyUser:", e.message);
    }
    
    req.user = {
      _id: user ? user.id : _id,
      id: user ? user.id : _id,
      role: Number(role),
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const isAdmin = (req, res, next) => {
  const r = req.user?.role;
  if (Number(r) === 3 || r === "admin" || r === "3") {
    return next();
  }
  return res.status(403).json({ message: "Admin access only" });
};

export const isBroker = (req, res, next) => {
  const r = req.user?.role;
  if (Number(r) === 2 || r === "partner" || r === "broker" || r === "2") {
    return next();
  }
  return res.status(403).json({ message: "Broker access only" });
};

export const isClient = (req, res, next) => {
  const r = req.user?.role;
  if (Number(r) === 1 || r === "borrower" || r === "client" || r === "1") {
    return next();
  }
  return res.status(403).json({ message: "Client access only" });
};

export const isClientOrBroker = (req, res, next) => {
  const r = req.user?.role;
  if (Number(r) === 1 || Number(r) === 2 || r === "borrower" || r === "partner" || r === "broker") {
    return next();
  }
  return res.status(403).json({ message: "Client or Broker access only" });
};
