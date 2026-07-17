import Lead from "../models/lead.model.js";
import Loan_Application from "../models/loan_application.js";
import Partner from "../models/partner.model.js";
import Loan_type from "../models/loan_type.js";
import Borrower from "../models/borrower.js";
import Status from "../models/status.js";

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

    // 1. Regular leads from Leads table
    const leads = await Lead.findAll({
      where: { broker_id: String(id) },
      order: [['createdAt', 'DESC']]
    });

    const regularLeads = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      number: lead.number,
      product: lead.product,
      status: lead.status,
      createdAt: lead.createdAt,
      source: 'lead',
    }));

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
            attributes: ['name'],
          }
        ],
        order: [['createdAt', 'DESC']],
      });

      appLeads = applications.map((app) => ({
        id: 'app_' + app.id,
        name: app.loan_purpose || 'Client Referral',
        product: app.loanType?.name || 'Loan',
        status: app.Status?.name?.toLowerCase() || 'applied',
        createdAt: app.createdAt,
        amount: app.loan_amount,
        client_preference: app.client_preference,
        source: 'application',
      }));
    }

    // Merge and sort by date
    const allLeads = [...regularLeads, ...appLeads].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      count: allLeads.length,
      leads: allLeads,
    });
  } catch (err) {
    console.error("Get partner leads error:", err);
    return res.status(500).json({ message: "Internal server error" });
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
    } = req.body;

    if (!loan_type_id || !loan_amount) {
      return res.status(400).json({ success: false, message: "loan_type_id and loan_amount are required" });
    }

    const clientPref = client_preference === 'partner' ? 'partner_routing' : 'direct_reach';

    // Build a clean loan_purpose: use provided purpose, fallback to loan type name
    const loanType = await Loan_type.findByPk(parseInt(loan_type_id));
    const purposeText = loan_purpose?.trim() || loanType?.name || 'General';

    const application = await Loan_Application.create({
      user_id: userId,
      partner_id: partnerId,
      loan_type_id: parseInt(loan_type_id),
      loan_amount: parseFloat(loan_amount),
      lender_id: preferred_lender_id ? parseInt(preferred_lender_id) : null,
      loan_purpose: `${purposeText} — ${name || 'Client'} (${number || ''})`,
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
