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
    console.log("DECODED TOKEN:", decoded);

    // decoded => { _id, role, iat, exp }
    const { _id, role } = decoded;
    console.log("EXTRACTED ROLE:", role, typeof role);

    // 3. Check for valid role (1=borrower, 2=partner, 3=admin)
    if (![1, 2, 3].includes(Number(role))) {
      console.log("ROLE VALIDATION FAILED!");
      return res.status(401).json({ message: "Invalid role" });
    }

    let user;
    if (Number(role) === 3) {
      user = await Admin.findByPk(_id);
    } else {
      user = await User.findByPk(_id);
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    req.user = {
      _id: user.id,
      role, // This is role_id
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== 3) {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

export const isBroker = (req, res, next) => {
  if (req.user?.role !== 2) {
    return res.status(403).json({ message: "Broker access only" });
  }
  next();
};

export const isClient = (req, res, next) => {
  if (req.user?.role !== 1) {
    return res.status(403).json({ message: "Client access only" });
  }
  next();
};

export const isClientOrBroker = (req, res, next) => {
  if (req.user?.role !== 1 && req.user?.role !== 2) {
    return res.status(403).json({ message: "Client or Broker access only" });
  }
  next();
};
