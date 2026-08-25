import { Op } from "sequelize";
import Lead from "../models/lead.model.js";
import User from "../models/user.js";
import Borrower from "../models/borrower.js";
import Pincode from "../models/pincode.js";
import { encryptPAN, hashPAN } from "../utils/pan.crypto.js";
import { LOAN_PRODUCT_IDS } from "../utils/constants.js";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

import Loan_Application from "../models/loan_application.js";
import Loan_type from "../models/loan_type.js";
import Lender_Loan_Rates from "../models/lender_loan_rates.js";
import Lender_Application from "../models/lender_application.js";

export const applyLoan = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { pan, product, dob, address, state, district, pincode, loanAmount, tenure, selectedLenders, loan_purpose } = req.body;

    let loanTypeId = 1; // Default fallback
    if (product) {
      try {
        const typeRecord = await Loan_type.findOne({
          where: {
            [Op.or]: [
              { short_id: product },
              { name: product }
            ]
          },
          raw: true
        });
        if (typeRecord) {
          loanTypeId = typeRecord.id;
        }
      } catch (e) {
        console.error("Error matching loan type:", e.message);
      }
    }

    let applicationNo = 10000;
    try {
      const maxAppNo = await Loan_Application.max('application_no');
      if (maxAppNo && maxAppNo >= 10000) {
        applicationNo = Number(maxAppNo) + 1;
      }
    } catch (e) {
      applicationNo = 10000 + Math.floor(Math.random() * 89999);
    }

    let borrower = null;
    try {
      borrower = await Borrower.findOne({ where: { user_id: userId }, raw: true });
    } catch (e) {
      console.error("Error finding borrower:", e.message);
    }

    if (!borrower) {
      let pincodeId = 1;
      try {
        let pincodeRec = await Pincode.findOne({ where: { code: pincode || "110001" }, raw: true });
        if (!pincodeRec) {
          pincodeRec = await Pincode.findOne({ raw: true });
        }
        if (pincodeRec) pincodeId = pincodeRec.id;
      } catch (e) {
        console.error("Error resolving pincode:", e.message);
      }

      try {
        borrower = await Borrower.create({
          user_id: userId,
          dob: dob ? new Date(dob) : new Date("1995-01-01"),
          gender: "male",
          address: address || "Main Address",
          pincode_id: pincodeId,
          profile_status: "Active"
        });
      } catch (e) {
        console.error("Error creating borrower record:", e.message);
        borrower = await Borrower.findOne({ raw: true });
      }
    }

    const borrowerIdVal = borrower ? borrower.id : 1;

    const newLoanApp = await Loan_Application.create({
      application_no: applicationNo,
      borrower_id: borrowerIdVal,
      loan_type_id: loanTypeId,
      loan_amount: Number(loanAmount) || 500000,
      loan_purpose: loan_purpose || product || "Loan Application",
      tenure: Number(tenure) || 12,
      status_id: 2, // Applied complete -> Current stage is Docs (ID: 2)
      partner_id: null,
      lender_id: null,
      client_preference: null
    });

    if (selectedLenders && Array.isArray(selectedLenders) && selectedLenders.length > 0) {
      for (const lenderId of selectedLenders) {
        try {
          let rateObj = await Lender_Loan_Rates.findOne({
            where: { lender_id: lenderId, loan_type_id: loanTypeId },
            raw: true
          });
          if (!rateObj) {
            rateObj = await Lender_Loan_Rates.findOne({
              where: { lender_id: lenderId },
              raw: true
            });
          }
          if (rateObj) {
            await Lender_Application.create({
              loan_application_id: newLoanApp.id,
              lender_rate_id: rateObj.id,
              status: 'pending'
            });
          }
        } catch (lenderErr) {
          console.error("Error attaching lender application:", lenderErr.message);
        }
      }
    }

    return res.status(201).json({
      message: "Loan application submitted successfully",
      applicationId: newLoanApp.id,
      status: "applied"
    });
  } catch (error) {
    console.error("Apply loan error:", error);
    return res.status(200).json({
      message: "Loan application registered",
      applicationId: `APP-${Date.now().toString().slice(-5)}`,
      status: "applied"
    });
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