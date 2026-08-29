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
import Lender from "../models/lender.js";
import Lender_Loan_Rates from "../models/lender_loan_rates.js";
import Lender_Application from "../models/lender_application.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import axios from "axios";
import { sendWelcomeEmail } from "../utils/email.js";
import { getCanonicalLender } from "../services/lenderSeed.service.js";

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
    const id = req.user.id || req.user._id;

    // 2. Loan applications referred by this partner
    let partner = await Partner.findOne({ where: { user_id: id } });
    if (!partner) {
      // Find or create Partner record for this broker
      const [newPartner] = await Partner.findOrCreate({
        where: { user_id: id }
      }).catch(() => [null]);
      partner = newPartner;
    }

    let appLeads = [];
    if (partner) {
      try {
        const applications = await Loan_Application.findAll({
          where: { partner_id: partner.id },
          include: [
            {
              model: Loan_type,
              as: 'loanType',
              attributes: ['id', 'name'],
              required: false
            },
            {
              model: Status,
              attributes: ['name'],
              required: false
            },
            {
              model: Borrower,
              required: false,
              include: [{
                model: User,
                as: 'user',
                attributes: ['name', 'mob_no'],
                required: false
              }]
            }
          ],
          order: [['createdAt', 'DESC']],
        });

        appLeads = await Promise.all(applications.map(async (app) => {
          let clientName = app.Borrower?.user?.name;
          let clientPhone = app.Borrower?.user?.mob_no;

          // Fallback: If Borrower user is null, query User table directly
          if (!clientName || !clientPhone) {
            if (app.borrower_id) {
              const b = await Borrower.findByPk(app.borrower_id, {
                include: [{ model: User, as: 'user', attributes: ['name', 'mob_no'] }]
              }).catch(() => null);
              if (b && b.user) {
                clientName = clientName || b.user.name;
                clientPhone = clientPhone || b.user.mob_no;
              } else {
                const u = await User.findByPk(app.borrower_id, { attributes: ['name', 'mob_no'] }).catch(() => null);
                if (u) {
                  clientName = clientName || u.name;
                  clientPhone = clientPhone || u.mob_no;
                }
              }
            }
          }

          const finalName = (clientName && clientName.trim() !== 'Client') ? clientName.trim() : 'Borrower';
          const loanTypeName = app.loanType?.name || app.loan_purpose || 'Personal Loan';
          const finalPhone = clientPhone || '';

          const titleParts = [finalName, loanTypeName];
          if (finalPhone) titleParts.push(finalPhone);

          return {
            id: 'app_' + app.id,
            appId: app.id,
            name: titleParts.join(' - '),
            clientName: finalName,
            loanTypeName: loanTypeName,
            clientPhone: finalPhone,
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
        }));
      } catch (appErr) {
        console.error("Error with joined loan application query:", appErr.message);
        // Fallback plain query without includes
        const rawApps = await Loan_Application.findAll({
          where: { partner_id: partner.id },
          order: [['createdAt', 'DESC']],
          raw: true
        }).catch(() => []);

        appLeads = rawApps.map(app => ({
          id: 'app_' + app.id,
          appId: app.id,
          name: 'Borrower - ' + (app.loan_purpose || 'Loan'),
          clientName: 'Borrower',
          loanTypeName: app.loan_purpose || 'Loan',
          clientPhone: '',
          product: app.loan_purpose || 'Loan',
          statusName: app.status_id === 2 ? 'approved' : app.status_id === 3 ? 'rejected' : 'applied',
          status_id: app.status_id,
          status: app.status_id === 2 ? 'approved' : app.status_id === 3 ? 'rejected' : 'pending',
          createdAt: app.createdAt,
          amount: app.loan_amount,
          client_preference: app.client_preference,
          source: 'application',
          isApp: true
        }));
      }
    }

    return res.json({
      count: appLeads.length,
      leads: appLeads,
    });
  } catch (err) {
    console.error("Get partner leads error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
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
      dob,
      gender,
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

    // Track if this is a brand-new user so we know whether to send the welcome email
    let isNewUser = false;

    if (!clientUser) {
      isNewUser = true;
      // Create new user profile with default password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Pass@1234", salt);

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

      let defaultPin = await Pincode.findOne();
      let fallbackPincodeId = defaultPin ? defaultPin.id : 1;

      let pincodeId = fallbackPincodeId;
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

      const validGender = (gender && ['male', 'female', 'other'].includes(gender.toLowerCase())) ? gender.toLowerCase() : 'other';

      // Create new borrower profile
      const newBorrower = await Borrower.create({
        user_id: clientUser.id,
        dob: dob ? new Date(dob) : new Date('1990-01-01'),
        gender: validGender,
        address: address || 'To be updated',
        pincode_id: pincodeId,
        profile_status: 'Active'
      });
      borrowerId = newBorrower.id;
    } else {
      // If user exists, update user's name & phone with the newly provided referral details
      if (name && name.trim()) {
        clientUser.name = name.trim();
        await clientUser.save();
      }
      if (number && number.trim()) {
        clientUser.mob_no = number.trim();
        await clientUser.save();
      }
      const validGender = (gender && ['male', 'female', 'other'].includes(gender.toLowerCase())) ? gender.toLowerCase() : 'other';

      // Find their borrower profile
      let defaultPin = await Pincode.findOne();
      let fallbackPincodeId = defaultPin ? defaultPin.id : 1;

      let existingBorrower = await Borrower.findOne({ where: { user_id: clientUser.id } });
      if (!existingBorrower) {
        existingBorrower = await Borrower.create({
          user_id: clientUser.id,
          dob: dob ? new Date(dob) : new Date('1990-01-01'),
          gender: validGender,
          address: address || 'To be updated',
          pincode_id: fallbackPincodeId,
          profile_status: 'Active'
        });
      }
      borrowerId = existingBorrower.id;
        
      let shouldSave = false;
      
      if (dob && (!existingBorrower.dob || existingBorrower.dob.toISOString().startsWith('1990-01-01'))) {
        existingBorrower.dob = new Date(dob);
        shouldSave = true;
      }
      if (gender && (!existingBorrower.gender || existingBorrower.gender === 'Other')) {
        existingBorrower.gender = validGender;
        shouldSave = true;
      }
      
      if (address && existingBorrower.address === 'To be updated') {
        existingBorrower.address = address;
        shouldSave = true;
      }
      if (pincode && existingBorrower.pincode_id === fallbackPincodeId) {
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

    let applicationNo = 10000;
    const maxAppNo = await Loan_Application.max('application_no');
    if (maxAppNo && maxAppNo >= 10000) {
      applicationNo = maxAppNo + 1;
    }

    const selectedLenders = req.body.selected_lenders || req.body.selectedLenders || req.body.preferred_lenders || [];

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
      status_id: 2, // Applied complete -> Current stage is Docs (ID: 2)
    });

    // Handle Lender Applications for multiple selected preferred lenders
    let firstLenderId = preferred_lender_id ? parseInt(preferred_lender_id) : null;

    if (Array.isArray(selectedLenders) && selectedLenders.length > 0) {
      for (const lenderItem of selectedLenders) {
        try {
          let lenderObj = null;
          if (typeof lenderItem === 'number' || (!isNaN(lenderItem) && !isNaN(parseInt(lenderItem)) && typeof lenderItem !== 'string')) {
            lenderObj = await Lender.findByPk(parseInt(lenderItem));
          } else if (typeof lenderItem === 'string' && lenderItem.trim()) {
            const cleanName = lenderItem.trim();
            const canonical = getCanonicalLender(cleanName);
            const targetName = canonical ? canonical.name : cleanName;
            const targetShort = canonical ? canonical.short : cleanName;
            const targetType = canonical ? canonical.type : 'private';

            lenderObj = await Lender.findOne({
              where: {
                [Op.or]: [
                  { name: targetName },
                  { short: targetShort },
                  { name: cleanName },
                  { short: cleanName }
                ]
              }
            });
            if (!lenderObj) {
              const [lRecord] = await Lender.findOrCreate({
                where: { name: targetName },
                defaults: {
                  name: targetName,
                  short: targetShort,
                  type: targetType,
                  offer: canonical?.offer || ''
                }
              });
              lenderObj = lRecord;
            }
          }

          if (lenderObj) {
            if (!firstLenderId) firstLenderId = lenderObj.id;

            const [rateObj] = await Lender_Loan_Rates.findOrCreate({
              where: {
                lender_id: lenderObj.id,
                loan_type_id: parseInt(loan_type_id)
              },
              defaults: {
                rate_type: 'floating',
                min_rate: 8.5,
                max_rate: 14.5
              }
            });

            if (rateObj) {
              await Lender_Application.create({
                loan_application_id: application.id,
                lender_rate_id: rateObj.id,
                status: 'pending'
              });
            }
          }
        } catch (lErr) {
          console.error("Error attaching lender application:", lErr.message);
        }
      }
    } else if (firstLenderId) {
      try {
        const [rateObj] = await Lender_Loan_Rates.findOrCreate({
          where: {
            lender_id: firstLenderId,
            loan_type_id: parseInt(loan_type_id)
          },
          defaults: {
            rate_type: 'floating',
            min_rate: 8.5,
            max_rate: 14.5
          }
        });
        if (rateObj) {
          await Lender_Application.create({
            loan_application_id: application.id,
            lender_rate_id: rateObj.id,
            status: 'pending'
          });
        }
      } catch (lErr) {
        console.error("Error attaching single lender application:", lErr.message);
      }
    }

    if (firstLenderId && !application.lender_id) {
      application.lender_id = firstLenderId;
      await application.save();
    }

    let waCredentials = null;
    if (clientPref === 'direct_reach' && isNewUser && email) {
      const defaultPassword = "Pass@1234";
      waCredentials = { username: email, password: defaultPassword };
      // Send welcome email with login credentials + referral/loan details
      try {
        const partnerUser = partner ? await User.findByPk(partner.user_id) : null;
        const partnerName = partnerUser ? partnerUser.name : 'your partner';
        await sendWelcomeEmail(email, name, defaultPassword, partnerName, loanType?.name || loanType, loan_amount);
        console.log(`✅ Welcome email dispatched to ${email}`);
      } catch (emailErr) {
        // Non-fatal — log and continue; application is already created
        console.error(`⚠️ Welcome email failed for ${email}:`, emailErr.message);
      }

      // --- OLD WhatsApp simulation (commented out) ---
      // console.log(`[WHATSAPP SIMULATION] Message to 91${number}`);
      // console.log(`Your Fin4Sure account has been created.\nUsername: ${email}\nPassword: Password@12`);
      //
      // try {
      //   const whatsapp_url = `https://graph.facebook.com/v20.0/${process.env.MOBILE_ID}/messages`;
      //   await axios.post(whatsapp_url, {
      //     messaging_product: "whatsapp",
      //     to: `91${number}`,
      //     type: "text",
      //     text: { body: `Your Fin4Sure account has been created.\n\nUsername: ${email}\nPassword: Password@12` }
      //   }, { headers: { Authorization: `Bearer ${process.env.TOKENS}`, "Content-Type": "application/json" } });
      // } catch (waError) {
      //   console.error("WhatsApp message failed:", waError?.response?.data || waError.message);
      // }
      // --- END old WhatsApp simulation ---
    }

    return res.status(201).json({
      success: true,
      message: "Referral submitted successfully",
      application,
      waCredentials
    });
  } catch (err) {
    console.error("Refer client error:", err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};
