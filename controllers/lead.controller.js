import Lead from "../models/lead.model.js";
import User from "../models/user.js";
import Borrower from "../models/borrower.js";
import { encryptPAN, hashPAN } from "../utils/pan.crypto.js";
import { LOAN_PRODUCT_IDS } from "../utils/constants.js";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

import Loan_Application from "../models/loan_application.js";
import Loan_type from "../models/loan_type.js";

export const applyLoan = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { pan, product, dob, address, state, district, pincode, loanAmount, tenure } = req.body;

        if (!product) {
          return res.status(400).json({ message: "Product is required" });
        }

        let client = await User.findByPk(userId);
        if (!client) {
          const user = await User.findByPk(userId);
          if (user && user.role_id === 1) {
            const borrower = await Borrower.findOne({ where: { user_id: userId } });
            /* We skip auto-creating User since we don't have enough details
            and the flow should have a User beforehand. */
            return res.status(404).json({ message: "User not found" });
          } else {
            return res.status(404).json({ message: "User not found" });
          }
        }

        if (pan) {
          const cleanPAN = pan.trim().toUpperCase();
          if (!PAN_REGEX.test(cleanPAN)) {
            return res.status(400).json({ message: "Invalid PAN format" });
          }
          const panHash = hashPAN(cleanPAN);
          const encryptedPAN = encryptPAN(cleanPAN);
          /* pan is not stored in user directly */
        }

        if (dob) client.dob = dob;
        /* Update Borrower address details if needed, for now skip since we need Borrower record */

        let loanTypeId = 1; // Default fallback
        const typeRecord = await Loan_type.findOne({ where: { short_id: product } });
        if (typeRecord) {
            loanTypeId = typeRecord.id;
        }

        let applicationNo = 10000;
        const maxAppNo = await Loan_Application.max('application_no');
        if (maxAppNo && maxAppNo >= 10000) {
          applicationNo = maxAppNo + 1;
        }
        
        const borrower = await Borrower.findOne({ where: { user_id: userId } });
        if (!borrower) {
          return res.status(404).json({ message: "Borrower profile not found" });
        }

        const newLoanApp = await Loan_Application.create({
          application_no: applicationNo,
          borrower_id: borrower.id,
          loan_type_id: loanTypeId,
          loan_amount: loanAmount || 0,
          loan_purpose: typeRecord ? typeRecord.name : product,
          tenure: tenure || 0,
          status_id: 1, // applied
          partner_id: null
        });

        return res.status(201).json({
          message: "Loan application submitted successfully",
          applicationId: newLoanApp.id,
          status: "applied"
        });
    } catch (error) {
        console.error("Apply loan error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMyLeads = async (req, res) => { // should be in client cause it provides client data to the client dashboard
  try {
    const userId = req.user.id || req.user._id;
    const applications = await Loan_Application.findAll({
      where: { user_id : userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Loan_type, as: 'loanType', attributes: ['name'] },
        { model: Status, attributes: ['name'] }
      ]
    });

    const formattedLeads = applications.map(app => ({
      product: app.loanType ? app.loanType.name : 'Unknown',
      status: app.Status ? app.Status.name : 'Unknown',
      createdAt: app.createdAt
    }));

    res.json(formattedLeads);

  } catch (err) {
    console.error("Get my leads error:", err);
    res.status(500).json({ message: "Server error" });
  }
};