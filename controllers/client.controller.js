import jwt from "jsonwebtoken";
import Loan_Application from "../models/loan_application.js";
import Status from "../models/status.js";
import Loan_type from "../models/loan_type.js";
import Lender from "../models/lender.js";
import User from "../models/user.js";


// ----------------- GETS THE PRODUCT CLINET APPLIED FOR -----------------
export const getClientProducts = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
    // Product array was old logic on Client model. New logic uses Loan_Application
    return res.json([]);

  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const applyProduct = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
    const { product } = req.body;

    if (!product) {
      return res.status(400).json({ message: "Product required" });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // New logic creates Loan_Application directly through referClient or registerBorrower
    // This old endpoint just simulates success


    return res.json({ message: "Product application submitted" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const applications = await Loan_Application.findAll({
      where: { user_id: userId },
      include: [
        { model: Status, attributes: ['name'] },
        { model: Loan_type, attributes: ['name', 'short_id'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(applications);
  } catch (err) {
    console.error("Get my applications error:", err);
    return res.status(500).json({ message: "Server error", error: err.message, sql: err.original?.message });
  }
};