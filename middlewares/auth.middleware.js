import { verifyToken } from "../utils/jwt.utlis.js";
import { sequelize } from "../config/db.js";
import { DataTypes } from "sequelize";
import User from "../models/user.js";
import Admin from "../models/admin.model.js";

export const verifyUser = async (req, res, next) => {
  try {
    let accessToken = req.cookies?.AccessToken; 
    if (!accessToken && req.headers?.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        accessToken = req.headers.authorization.split(" ")[1];
      } else {
        accessToken = req.headers.authorization;
      }
    }

    if (!accessToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. Verify and decode JWT (RSA verification)
    const decoded = verifyToken(accessToken);

    // decoded => { _id, role, role_id, iat, exp }
    const { _id, role, role_id } = decoded;
    const resolvedRole = role !== undefined ? role : role_id;

    let user = null;
    try {
      if (Number(resolvedRole) === 3 || resolvedRole === "admin") {
        user = await Admin.findByPk(_id);
        if (!user) user = await User.findByPk(_id);
      } else {
        user = await User.findByPk(_id);
        if (!user) user = await Admin.findByPk(_id);
      }
    } catch (e) {
      console.error("User lookup error in verifyUser:", e.message);
    }
    
    const roleIdVal = (Number(resolvedRole) === 3 || resolvedRole === "admin" || (user && user.email === "admin@finn4sure.com")) ? 3 : Number(resolvedRole);

    req.user = {
      _id: user ? user.id : _id,
      id: user ? user.id : _id,
      role: roleIdVal,
      email: user ? user.email : ""
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const isAdmin = (req, res, next) => {
  const r = req.user?.role;
  if (Number(r) === 3 || r === "admin" || r === "3" || req.user?.email === "admin@finn4sure.com") {
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
