import Lead from "../models/lead.model.js";
import Loan_Application from "../models/loan_application.js";
import Partner from "../models/partner.model.js";
import Loan_type from "../models/loan_type.js";
import Status from "../models/status.js";
import User from "../models/user.js";
import Borrower from "../models/borrower.js";
import Pincode from "../models/pincode.js";
import City from "../models/city.js";
import District from "../models/district.js";
import State from "../models/state.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";

// ----------------- GETTING CLIENT DETAILS OF THE PARTNER(INDIVIDUAL) -----------------
export const getReferredClients = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
    // Clients logic needs to be updated since Borrower has no broker_id
    const clients = [];

    return res.json({
      count: clients.length,
      clients,
    });
  } catch (err) {
    console.error("Get partner clients error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ----------------- GETTING LEADS DATA OF PARTNER(INDIVIDUAL) -----------------
export const getBrokerLeads = async (req, res) => {
  try {
    const id = req.user._id;

    // 2. Loan applications referred by this partner
    const partner = await Partner.findOne({ where: { user_id: id } });
    let appLeads = [];
    if (partner) {
      const applications = await Loan_Application.findAll({
        where: { partner_id: partner.id },
        include: [
          {
            model: Loan_type,
            as: 'loanType',
            attributes: ['id', 'name'],
          },
          {
            model: Status,
            attributes: ['name']
          },
          {
            model: Borrower,
            include: [{
              model: User,
              as: 'user',
              attributes: ['name', 'mob_no']
            }]
          }
        ],
        order: [['createdAt', 'DESC']],
      });

      appLeads = applications.map((app) => {
        const parts = app.loan_purpose ? app.loan_purpose.split(' — ') : [];
        const purpose = parts[0] || 'Loan';
        let clientName = 'Client';
        let clientPhone = '';
        if (parts[1]) {
          const subParts = parts[1].split(' (');
          clientName = subParts[0] || 'Client';
          if (subParts[1]) {
            clientPhone = subParts[1].replace(')', '');
          }
        }
        return {
          id: 'app_' + app.id,
          appId: app.id,
          name: `${clientName} - ${purpose} - ${clientPhone}`,
          product: app.loanType?.name || 'Loan',
          statusName: app.Status?.name?.toLowerCase() || 'applied',
          status_id: app.status_id,
          status: app.status_id === 2 ? 'approved' : app.status_id === 3 ? 'rejected' : 'pending',
          createdAt: app.createdAt,
          amount: app.loan_amount,
          client_preference: app.client_preference,
          source: 'application',
          isApp: true
        };
      });
    }

    return res.json({
      count: appLeads.length,
      leads: appLeads,
    });
  } catch (err) {
    console.error("Get partner leads error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message, sql: err.original?.message });
  }
};

// ----------------- PARTNER REFERS A CLIENT (saves Loan_Application) -----------------
export const referClient = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find this broker's partner record to get partner_id
    const partner = await Partner.findOne({ where: { user_id: userId } });
    const partnerId = partner ? partner.id : null;

    const {
      name,
      number,
      email,
      loan_type_id,
      loan_amount,
      loan_purpose,
      preferred_lender_id,
      client_preference,
      address,
      pincode,
      state,
      district,
      city,
      tenure,
    } = req.body;

    if (!loan_type_id || !loan_amount) {
      return res.status(400).json({ success: false, message: "loan_type_id and loan_amount are required" });
    }

    const clientPref = client_preference === 'partner' ? 'partner_routing' : 'direct_reach';

    // Build a clean loan_purpose: use provided purpose, fallback to loan type name
    const loanType = await Loan_type.findByPk(parseInt(loan_type_id));
    const purposeText = loan_purpose?.trim() || loanType?.name || 'General';

    // Check if user already exists
    let clientUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email: email }, { mob_no: number }] 
      } 
    });

    let borrowerId = null;

    if (!clientUser) {
      // Create new user profile with dummy password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Password@12", salt);

      clientUser = await User.create({
        name: name,
        email: email,
        mob_no: number,
        password_hash: hashedPassword,
        role_id: 1, // Borrower role
        status: 'active'
      });

      // Send WhatsApp message to user (Commented out for now as per instructions)
      // await sendWhatsAppMessage(number, `Your Fin4Sure account has been created. Temporary password: Password@12. Please log in and change your password.`);

      let pincodeId = 1;
      if (pincode) {
        let pin = await Pincode.findOne({ where: { code: pincode } });
        if (!pin && state && district && city) {
          const [stateObj] = await State.findOrCreate({ where: { name: state }, defaults: { country: "India" } });
          const [districtObj] = await District.findOrCreate({ where: { name: district }, defaults: { state_id: stateObj.id } });
          const [cityObj] = await City.findOrCreate({ where: { name: city }, defaults: { district_id: districtObj.id } });
          pin = await Pincode.create({ code: pincode, city_id: cityObj.id });
        }
        if (pin) pincodeId = pin.id;
      }

      // Create new borrower profile
      const newBorrower = await Borrower.create({
        user_id: clientUser.id,
        dob: new Date('1990-01-01'), // Default dummy DOB
        gender: 'Other',
        address: address || 'To be updated',
        pincode_id: pincodeId,
        profile_status: 'Active'
      });
      borrowerId = newBorrower.id;
    } else {
      // If user exists, find their borrower profile
      const existingBorrower = await Borrower.findOne({ where: { user_id: clientUser.id } });
      if (existingBorrower) {
        borrowerId = existingBorrower.id;
        
        let shouldSave = false;
        if (address && existingBorrower.address === 'To be updated') {
          existingBorrower.address = address;
          shouldSave = true;
        }
        if (pincode && existingBorrower.pincode_id === 1) {
          let pin = await Pincode.findOne({ where: { code: pincode } });
          if (!pin && state && district && city) {
            const [stateObj] = await State.findOrCreate({ where: { name: state }, defaults: { country: "India" } });
            const [districtObj] = await District.findOrCreate({ where: { name: district }, defaults: { state_id: stateObj.id } });
            const [cityObj] = await City.findOrCreate({ where: { name: city }, defaults: { district_id: districtObj.id } });
            pin = await Pincode.create({ code: pincode, city_id: cityObj.id });
          }
          if (pin) {
            existingBorrower.pincode_id = pin.id;
            shouldSave = true;
          }
        }
        if (shouldSave) {
          await existingBorrower.save();
        }
      }
    }

    let applicationNo = 10000;
    const maxAppNo = await Loan_Application.max('application_no');
    if (maxAppNo && maxAppNo >= 10000) {
      applicationNo = maxAppNo + 1;
    }

    const application = await Loan_Application.create({
      application_no: applicationNo,
      borrower_id: borrowerId,
      partner_id: partnerId,
      loan_type_id: parseInt(loan_type_id),
      loan_amount: parseFloat(loan_amount),
      lender_id: preferred_lender_id ? parseInt(preferred_lender_id) : null,
      loan_purpose: purposeText,
      tenure: tenure ? parseInt(tenure) : null,
      client_preference: clientPref,
      status_id: 1, // pending
    });

    return res.status(201).json({
      success: true,
      message: "Referral submitted successfully",
      application,
    });
  } catch (err) {
    console.error("Refer client error:", err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};
