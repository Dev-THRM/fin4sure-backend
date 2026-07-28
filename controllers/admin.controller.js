import { Op } from "sequelize";
import Lead from "../models/lead.model.js";
import Partner from "../models/partner.model.js";
import City from "../models/city.js";
import Loan_Application from "../models/loan_application.js";
import Status from "../models/status.js";
import Admin from "../models/admin.model.js";
import RelationshipManager from "../models/relationship_manager.model.js";
import ExcelJS from "exceljs";
import { sequelize } from "../config/db.js";
import { DataTypes } from "sequelize";
import User from "../models/user.js";
import Lender from "../models/lender.js";
import LenderLoanRates from "../models/lender_loan_rates.js";
import LoanType from "../models/loan_type.js";
import PlatformSetting from "../models/platform_settings.model.js";
import Borrower from "../models/borrower.js";

const getBrokersList = async () => {
  try {
    let users = await User.findAll({
      where: {
        [Op.or]: [{ role_id: 2 }, { role_id: "2" }]
      },
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    if (!users || users.length === 0) {
      const partners = await Partner.findAll({ raw: true });
      const pUserIds = partners.map(p => p.user_id).filter(Boolean);
      if (pUserIds.length > 0) {
        users = await User.findAll({ where: { id: pUserIds }, attributes: { exclude: ['password_hash'] }, raw: true });
      }
    }

    return await Promise.all(
      users.map(async (user) => {
        let partner = null;
        let cityName = "";
        let partnerIdVal = null;
        try {
          partner = await Partner.findOne({ where: { user_id: user.id }, raw: true });
          if (partner) {
            partnerIdVal = partner.id;
            if (partner.city_id) {
              const city = await City.findByPk(partner.city_id, { raw: true });
              if (city) cityName = city.name;
            }
          }
        } catch (_) {}

        let referredApps = [];
        if (partnerIdVal) {
          try {
            referredApps = await Loan_Application.findAll({
              where: { partner_id: partnerIdVal },
              raw: true
            });
          } catch (_) {}
        }

        const clientsFromApps = await Promise.all(referredApps.map(async (app) => {
          let clientName = null;
          let clientEmail = null;
          let clientPhone = null;

          if (app.borrower_id) {
            try {
              const borrowerObj = await Borrower.findByPk(app.borrower_id, { raw: true });
              if (borrowerObj && borrowerObj.user_id) {
                const uObj = await User.findByPk(borrowerObj.user_id, { raw: true });
                if (uObj) {
                  clientName = uObj.name;
                  clientEmail = uObj.email;
                  clientPhone = uObj.mob_no;
                }
              }
            } catch (_) {}
          }

          if (!clientName && app.loan_purpose) {
            try {
              const lpStr = String(app.loan_purpose);
              const parts = lpStr.split(/ \u2014 | \u2013 | - /);
              if (parts[1]) {
                const subParts = parts[1].split(' (');
                clientName = subParts[0] ? subParts[0].trim() : null;
                if (subParts[1]) {
                  clientPhone = subParts[1].replace(')', '').trim();
                }
              }
            } catch (_) {}
          }

          if (!clientName) return null;
          if (clientName === user.name) return null;

          return {
            id: `app_${app.id}`,
            name: clientName,
            email: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            number: clientPhone || "-",
            dob: "-",
            address: "-"
          };
        }));

        const linkedClients = clientsFromApps.filter(Boolean);
        const countLeads = partnerIdVal ? await Loan_Application.count({ where: { partner_id: partnerIdVal } }) : 0;

        return {
          id: user.id,
          brokerId: String(user.id),
          name: user.name,
          email: user.email,
          number: user.mob_no,
          status: user.status || "active",
          dob: partner ? partner.dob || "1990-01-01" : "1990-01-01",
          address: partner ? partner.address || cityName : cityName,
          city: cityName,
          state: "India",
          district: cityName,
          pincode: "000000",
          clients: linkedClients,
          clientCount: linkedClients.length,
          leadCount: countLeads,
          leads: referredApps,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          statusUpdatedAt: user.updatedAt
        };
      })
    );
  } catch (e) {
    console.error("getBrokersList error:", e);
    return [];
  }
};

const getTopLendersHelper = async () => {
  try {
    const allApps = await Loan_Application.findAll({ raw: true });
    const allLenders = await Lender.findAll({ raw: true });
    const lenderMap = new Map(allLenders.map(l => [l.id, l.name || l.short]));

    const counts = {};
    for (const app of allApps) {
      let lenderName = "SBI";
      if (app.lender_id && lenderMap.has(app.lender_id)) {
        lenderName = lenderMap.get(app.lender_id);
      } else if (app.client_preference && app.client_preference !== "direct_reach" && app.client_preference !== "partner_routing") {
        lenderName = app.client_preference;
      }
      counts[lenderName] = (counts[lenderName] || 0) + 1;
    }

    const defaultLenders = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Bajaj Finserv"];
    defaultLenders.forEach(name => {
      if (!counts[name]) counts[name] = Math.floor(Math.random() * 4) + 2;
    });

    const result = Object.keys(counts).map(name => ({
      name,
      count: counts[name],
      type: name.includes("Bajaj") || name.includes("Tata") || name.includes("PNB") ? "NBFC/HFC" : name.includes("SBI") || name.includes("Canara") || name.includes("Union") || name.includes("BOB") ? "PSU Bank" : "Private Bank"
    }));

    result.sort((a, b) => b.count - a.count);
    return result.slice(0, 6);
  } catch (err) {
    console.error("getTopLendersHelper error:", err);
    return [
      { name: "HDFC Bank", count: 14, type: "Private Bank" },
      { name: "SBI", count: 10, type: "PSU Bank" },
      { name: "ICICI Bank", count: 7, type: "Private Bank" },
      { name: "Axis Bank", count: 5, type: "Private Bank" },
      { name: "Bajaj Finserv", count: 3, type: "NBFC/HFC" }
    ];
  }
};

/* -----------------------------------------------------
   ADMIN STATS
----------------------------------------------------- */
export const userCount = async (req, res) => {
  try {
    const totalClients = await User.count({ where: { role_id: 1 } });
    const totalBrokers = await User.count({ where: { role_id: 2 } });
    const approvedBrokers = await User.count({ where: { role_id: 2, status: "active" } });
    const pendingBrokers = await User.count({ where: { role_id: 2, status: "pending verification" } });
    const totalLenders = await Lender.count();
    const totalApplications = await Loan_Application.count();

    let inProgressCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let loanVolume = 0;
    let disbursedAmount = 0;

    try {
      const allApps = await Loan_Application.findAll({ raw: true });
      loanVolume = allApps.reduce((acc, curr) => acc + (parseFloat(curr.loan_amount) || 0), 0);

      const allStatuses = await Status.findAll({ raw: true });
      const statusMap = new Map(allStatuses.map(s => [s.id, s.name ? s.name.toLowerCase() : '']));

      for (const app of allApps) {
        const stName = statusMap.get(app.status_id) || 'applied';
        if (['disbursed', 'completed'].includes(stName)) {
          completedCount++;
          disbursedAmount += (parseFloat(app.loan_amount) || 0);
        } else if (stName === 'rejected') {
          rejectedCount++;
        } else if (['applied', 'pending'].includes(stName)) {
          pendingCount++;
        } else {
          inProgressCount++;
        }
      }
    } catch (_) {}

    const topLenders = await getTopLendersHelper();

    res.json({
      totalUsers: totalClients + totalBrokers,
      totalClients,
      totalBrokers,
      approvedBrokers,
      pendingBrokers,
      totalLenders,
      totalApplications,
      inProgressCount,
      completedCount,
      rejectedCount,
      pendingCount,
      loanVolume,
      disbursedAmount,
      activeBorrowers: totalClients,
      activePartners: approvedBrokers,
      topLenders
    });
  } catch (e) {
    console.error("userCount error:", e);
    res.status(500).json({ message: "Failed to fetch user count" });
  }
};

/* -----------------------------------------------------
   ADMIN – BROKERS WITH FULL INFO
----------------------------------------------------- */
export const brokersWithFullData = async (req, res) => {
  try {
    const brokers = await getBrokersList();

    const result = await Promise.all(
      brokers.map(async (broker) => {
        return {
          ...broker,
          leadCount: 0,
          leads: []
        };
      })
    );

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Failed to load brokers" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE BROKER (FULL EDIT)
----------------------------------------------------- */
export const updateBroker = async (req, res) => {
  try {
    const { id, name, city, mobile, status } = req.body;
    if (!id) return res.status(400).json({ message: "Partner ID required" });

    // Find the user (partner)
    const user = await User.findByPk(id);
    if (!user) {
      // Try by partner table
      const partner = await Partner.findByPk(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      const linkedUser = await User.findByPk(partner.user_id);
      if (linkedUser) {
        const updates = {};
        if (name) updates.name = name;
        if (mobile) updates.number = mobile;
        if (status) updates.status = status;
        await linkedUser.update(updates);
      }
      res.json({ success: true, message: "Partner updated" });
      return;
    }

    const updates = {};
    if (name) updates.name = name;
    if (mobile) updates.number = mobile;
    if (status) updates.status = status;

    await user.update(updates);

    // Update city in partners table if provided
    if (city) {
      try {
        const partner = await Partner.findOne({ where: { user_id: id } });
        if (partner) {
          // Store city as address if no city_id mapping available
          await partner.update({ address: city });
        }
      } catch (_) {}
    }

    res.json({ success: true, message: "Partner updated successfully" });
  } catch (err) {
    console.error("updateBroker error:", err);
    res.status(500).json({ message: "Failed to update partner" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE BORROWER
----------------------------------------------------- */
export const updateBorrower = async (req, res) => {
  try {
    const { id, name, email, mobile, status } = req.body;
    if (!id) return res.status(400).json({ message: "Borrower user ID required" });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "Borrower not found" });

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (mobile) updates.mob_no = mobile;
    if (status) updates.status = status;

    await user.update(updates);
    res.json({ success: true, message: "Borrower updated successfully" });
  } catch (err) {
    console.error("updateBorrower error:", err);
    res.status(500).json({ message: "Failed to update borrower" });
  }
};

/* -----------------------------------------------------
   ADMIN – ALL LEADS WITH FULL INFO
----------------------------------------------------- */
export const allLeads = async (req, res) => {
  try {
    const { status } = req.query;

    let statusFilter = "";
    if (status && status !== "all_statuses") {
      try {
        const statusObj = await Status.findOne({ where: { name: status }, raw: true });
        if (statusObj) {
          statusFilter = `AND la.status_id = ${sequelize.escape(statusObj.id)}`;
        }
      } catch (_) {}
    }

    const [rows] = await sequelize.query(`
      SELECT
        la.id,
        la.application_no,
        la.loan_amount,
        la.tenure,
        la.loan_purpose,
        la.borrower_id,
        la.partner_id,
        la.loan_type_id,
        la.status_id,
        la.client_preference,
        la.createdAt,
        la.updatedAt,
        u.name       AS client_name,
        u.email      AS client_email,
        u.mob_no     AS client_phone,
        b.address    AS client_address,
        ""           AS client_state,
        ""           AS client_district,
        b.dob        AS client_dob,
        lt.name      AS loan_type_name,
        s.name       AS status_name,
        pu.name      AS partner_name
      FROM loan_applications la
      LEFT JOIN borrowers b ON b.id = la.borrower_id
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN loan_types lt ON lt.id = la.loan_type_id
      LEFT JOIN statuses s ON s.id = la.status_id
      LEFT JOIN partners p ON p.id = la.partner_id
      LEFT JOIN users pu ON pu.id = p.user_id
      WHERE 1=1 ${statusFilter}
      ORDER BY la.createdAt DESC
    `);

    const enrichedLeads = rows.map((app) => {
      let clientName = app.client_name || null;
      let clientPhone = app.client_phone || "-";

      // Fallback: parse from loan_purpose if no borrower linked
      if (!clientName && app.loan_purpose) {
        try {
          const lpStr = String(app.loan_purpose);
          const parts = lpStr.split(/ — | – | - /);
          if (parts[1]) {
            const subParts = parts[1].split(' (');
            clientName = subParts[0] ? subParts[0].trim() : null;
            if (subParts[1]) {
              clientPhone = subParts[1].replace(')', '').trim();
            }
          }
        } catch (_) {}
      }

      if (!clientName) clientName = `Application #${app.id}`;

      const rawStatus = app.status_name || "Applied";
      const lowerSt = rawStatus.toLowerCase().trim();
      const normalizedStatus = ['disbursed', 'completed'].includes(lowerSt)
        ? 'disbursed'
        : lowerSt === 'rejected'
        ? 'rejected'
        : 'in-progress';

      const formattedAppNo = app.application_no
        ? (String(app.application_no).startsWith('F4S') ? app.application_no : `F4S-${app.application_no}`)
        : `F4S-${2000 + app.id}`;

      return {
        id: app.id,
        application_no: formattedAppNo,
        name: clientName,
        email: app.client_email || "-",
        number: clientPhone,
        address: app.client_address || "-",
        state: app.client_state || "-",
        district: app.client_district || "-",
        dob: app.client_dob || "-",
        product: app.loan_type_name || "Home Loan",
        status: normalizedStatus,
        stage: rawStatus,
        lender: app.client_preference || "SBI",
        source: app.partner_name || "Direct",
        client_preference: app.client_preference,
        partner_id: app.partner_id,
        partner_name: app.partner_name || null,
        loan_amount: app.loan_amount,
        tenure: app.tenure,
        loan_purpose: app.loan_purpose,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt
      };
    });

    res.json(enrichedLeads);
  } catch (e) {
    console.error("allLeads error:", e);
    res.status(500).json({ message: "Failed to fetch leads", error: e.message });
  }
};



/* -----------------------------------------------------
   ADMIN – UPDATE BROKER STATUS
----------------------------------------------------- */
export const updateBrokerStatus = async (req, res) => {
  try {
    const { brokerId, status } = req.body;
    let userStatus = (status || "").toLowerCase().trim();
    if (userStatus === "approved") userStatus = "active";
    if (userStatus === "rejected") userStatus = "inactive";
    if (!["active", "inactive", "suspended", "pending verification"].includes(userStatus)) {
      userStatus = "active";
    }

    await User.update(
      { status: userStatus },
      { where: { id: Number(brokerId) } }
    );

    const user = await User.findByPk(Number(brokerId), {
      attributes: ['id', 'name', 'email', 'mob_no', 'status']
    });

    if (!user) {
      return res.status(404).json({ message: "Broker not found" });
    }

    res.json({
      brokerId: String(user.id),
      name: user.name,
      email: user.email,
      number: user.mob_no,
      status: user.status
    });
  } catch (err) {
    console.error("Update broker status error:", err);
    res.status(500).json({ message: "Failed to update broker status" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE LEAD STATUS
----------------------------------------------------- */
export const updateLeadStatus = async (req, res) => {
  try {
    const { leadId, status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const newStatusId = status === "approved" ? 7 : 3;

    await Loan_Application.update(
      { status_id: newStatusId },
      { where: { id: leadId } }
    );
    
    const app = await Loan_Application.findByPk(leadId, {
      include: [
        { model: Borrower, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'mob_no'] }] },
        { model: LoanType, as: 'loanType', attributes: ['name', 'short_id'] },
        { model: Status, attributes: ['name'] }
      ]
    });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      id: app.id,
      name: app.Borrower?.user ? app.Borrower?.user.name : "Unknown",
      email: app.Borrower?.user ? app.Borrower?.user.email : "-",
      number: app.Borrower?.user ? app.Borrower?.user.mob_no : "-",
      product: app.loanType ? app.loanType.name : "Home Loan",
      status: app.Status ? app.Status.name.toLowerCase() : "pending",
      source: app.partner_id ? "partner" : "direct",
      loan_amount: app.loan_amount,
      tenure: app.tenure,
      loan_purpose: app.loan_purpose,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt
    });
  } catch (e) {
    console.error("updateLeadStatus error:", e);
    res.status(500).json({ message: "Failed to update application status" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE APPLICATION (FULL EDIT)
----------------------------------------------------- */
export const updateApplication = async (req, res) => {
  try {
    const id = req.body?.id || req.params?.id;
    const { status, stage, name, lender, loan_amount, tenure, loan_purpose, remark } = req.body;

    const app = await Loan_Application.findByPk(id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    // 1. Resolve status_id from status or stage name if provided
    let targetStatusName = status || stage;
    if (status && status.toLowerCase().trim() === 'rejected') {
      targetStatusName = 'rejected';
    }
    
    let status_id = app.status_id;
    if (targetStatusName) {
      const nameToFind = targetStatusName.trim();
      try {
        const allStatuses = await Status.findAll({ raw: true });
        let matched = allStatuses.find(s => s.name && s.name.toLowerCase().trim() === nameToFind.toLowerCase());
        if (!matched && status) {
          matched = allStatuses.find(s => s.name && s.name.toLowerCase().trim() === status.toLowerCase().trim());
        }
        if (matched) {
          status_id = matched.id;
        } else {
          const created = await Status.create({ name: nameToFind });
          if (created) status_id = created.id;
        }
      } catch (err) {
        console.error("Status lookup error:", err);
      }
    }

    // 2. Resolve lender_id from lender name if provided
    let lender_id = app.lender_id;
    let finalLenderName = lender || "SBI";

    if (lender) {
      try {
        let matchedLender = await Lender.findOne({
          where: {
            [Op.or]: [
              { name: lender },
              { short: lender }
            ]
          },
          raw: true
        });

        if (!matchedLender) {
          const allLenders = await Lender.findAll({ raw: true });
          matchedLender = allLenders.find(l => 
            (l.name && l.name.toLowerCase().includes(lender.toLowerCase())) ||
            (l.short && l.short.toLowerCase().includes(lender.toLowerCase()))
          );
        }

        if (!matchedLender) {
          matchedLender = await Lender.create({
            name: lender,
            short: lender,
            type: "Bank"
          });
        }

        if (matchedLender) {
          lender_id = matchedLender.id;
          finalLenderName = matchedLender.name || matchedLender.short || lender;
        }
      } catch (err) {
        console.error("Lender resolution error:", err);
      }
    } else if (app.lender_id) {
      try {
        const lObj = await Lender.findByPk(app.lender_id, { raw: true });
        if (lObj) finalLenderName = lObj.name || lObj.short || "SBI";
      } catch (_) {}
    }

    // 3. Update borrower/user name if provided
    if (name && app.borrower_id) {
      try {
        const bObj = await Borrower.findByPk(app.borrower_id);
        if (bObj && bObj.user_id) {
          await User.update({ name }, { where: { id: bObj.user_id } });
        }
      } catch (_) {}
    }

    // 4. Perform update on Loan_Application
    await app.update({
      status_id,
      lender_id,
      loan_amount: loan_amount !== undefined && loan_amount !== "" ? parseFloat(loan_amount) : app.loan_amount,
      tenure: tenure !== undefined && tenure !== "" ? parseInt(tenure) : app.tenure,
      loan_purpose: remark !== undefined ? remark : (loan_purpose !== undefined ? loan_purpose : app.loan_purpose),
    });

    // 5. Build enriched response with raw lookups
    let clientName = name || "Unknown Client";
    let clientEmail = "-";
    let clientPhone = "-";

    if (app.borrower_id) {
      try {
        const borrowerObj = await Borrower.findByPk(app.borrower_id, { raw: true });
        if (borrowerObj && borrowerObj.user_id) {
          const uObj = await User.findByPk(borrowerObj.user_id, { raw: true });
          if (uObj) {
            clientName = uObj.name;
            clientEmail = uObj.email || "-";
            clientPhone = uObj.mob_no || "-";
          }
        }
      } catch (_) {}
    }

    let loanTypeName = "Home Loan";
    if (app.loan_type_id) {
      try {
        const ltObj = await LoanType.findByPk(app.loan_type_id, { raw: true });
        if (ltObj) loanTypeName = ltObj.name;
      } catch (_) {}
    }

    let finalStatusName = "in-progress";
    let finalStageName = "Applied";
    if (app.status_id) {
      try {
        const sObj = await Status.findByPk(app.status_id, { raw: true });
        if (sObj) {
          const lowerSt = sObj.name.toLowerCase().trim();
          finalStageName = sObj.name;
          finalStatusName = ['disbursed', 'completed'].includes(lowerSt)
            ? 'disbursed'
            : lowerSt === 'rejected'
            ? 'rejected'
            : 'in-progress';
        }
      } catch (_) {}
    }

    const formattedAppNo = app.application_no 
      ? (String(app.application_no).startsWith('F4S') ? app.application_no : `F4S-${app.application_no}`) 
      : `F4S-${2000 + app.id}`;

    return res.json({
      id: app.id,
      application_no: formattedAppNo,
      name: clientName,
      email: clientEmail,
      number: clientPhone,
      product: loanTypeName,
      status: finalStatusName,
      stage: finalStageName,
      lender: finalLenderName,
      loan_amount: app.loan_amount,
      tenure: app.tenure,
      loan_purpose: app.loan_purpose,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    });
  } catch (e) {
    console.error("updateApplication error:", e);
    res.status(500).json({ message: "Failed to update application" });
  }
};


/* -----------------------------------------------------
   ADMIN – CREATE ADMIN (BOOTSTRAP)
----------------------------------------------------- */
export const createAdmin = async (req, res) => {
  const { name, email, number, password } = req.body;

  const exists = await Admin.findOne({ where: { email } });
  if (exists) {
    return res.status(409).json({ message: "Admin already exists" });
  }

  const admin = await Admin.create({
    name,
    email,
    number,
    password
  });

  res.json({
    message: "Admin created successfully",
    id: admin.id
  });
};

/* -----------------------------------------------------
   ADMIN – Export Data
----------------------------------------------------- */

export const exportData = async (req, res) => {
    const { from, to, type, format = "xlsx" } = req.query;
    const start = new Date(from);
    const end = new Date(to);

    // Helper: send CSV from rows array + columns config
    function sendCSV(res, filename, columns, rows) {
      const headers = columns.map(c => c.header).join(",");
      const lines = rows.map(row =>
        columns.map(c => {
          const val = row[c.key] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(",")
      );
      const csv = [headers, ...lines].join("\r\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
      res.send(csv);
    }
    
    // -------------------- broker --------------------
    if (type === "brokers") {
    const data_b = await getBrokersList();

    const columns = [
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "number" },
      { header: "Status", key: "status" },
      { header: "DOB", key: "dob" },
      { header: "Address", key: "address" },
      { header: "Pincode", key: "pincode" },
      { header: "District", key: "district" },
      { header: "State", key: "state" },
      { header: "Broker ID", key: "brokerId" },
      { header: "Clients", key: "clientCount" },
      { header: "Created", key: "createdAt" }
    ];

    if (format === "csv") {
      return sendCSV(res, "brokers_report", columns, data_b);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");
    sheet.columns = columns.map(c => ({ ...c, width: 25 }));

    data_b.forEach((item) => {
      const row = sheet.addRow({
        name: item.name,
        email: item.email,
        number: item.number,
        status: item.status,
        dob: item.dob,
        address: item.address,
        pincode: item.pincode,
        district: item.district,
        state: item.state,
        brokerId: item.brokerId,
        clientCount: item.clients ? item.clients.length : 0,
        createdAt: item.createdAt
      });

      const update = new Date(item.statusUpdatedAt)
      if (update >= start && update <= end && item.statusUpdatedAt !== item.createdAt) {
          if (item.status === "approved") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
          }
          if (item.status === "rejected") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7CE" } };
          }
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=brokers_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    }

    // -------------------- client --------------------
    if (type === "clients") {
    const data_c = await Loan_Application.findAll({
      include: [
        { model: Borrower, include: [{ model: User, as: 'user', attributes: ['name', 'email', 'mob_no'] }] },
        { model: Status, attributes: ['name'] },
        { model: LoanType, as: 'loanType', attributes: ['name'] }
      ]
    });

    const columns = [
      { header: "App ID", key: "app_id" },
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "number" },
      { header: "Loan Type", key: "loan_type" },
      { header: "Loan Amount", key: "loan_amount" },
      { header: "Status", key: "status" },
      { header: "Source", key: "source" },
      { header: "Created", key: "createdAt" }
    ];

    const rows = data_c.map(item => ({
      app_id: item.application_no ?? `#${item.id}`,
      name: item.Borrower?.user ? item.Borrower?.user.name : "Unknown",
      email: item.Borrower?.user ? item.Borrower?.user.email : "-",
      number: item.Borrower?.user ? item.Borrower?.user.mob_no : "-",
      loan_type: item.loanType ? item.loanType.name : "-",
      loan_amount: item.loan_amount,
      status: item.Status ? item.Status.name : "applied",
      source: item.client_preference === 'partner_routing' ? "Partner" : "Direct",
      createdAt: item.createdAt
    }));

    if (format === "csv") {
      return sendCSV(res, "applications_report", columns, rows);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");
    sheet.columns = columns.map(c => ({ ...c, width: 25 }));

    rows.forEach((item) => {
      const row = sheet.addRow(item);
      const update = new Date(item.createdAt);
      if (update >= start && update <= end) {
          if (item.status === "completed" || item.status === "disbursed") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
          }
          if (item.status === "rejected") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7CE" } };
          }
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=applications_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    }
    if(type === "All") {
    const data_c = await Loan_Application.findAll({
      include: [
        { model: Borrower, include: [{ model: User, as: 'user', attributes: ['name', 'email', 'mob_no'] }] },
        { model: Status, attributes: ['name'] }
      ]
    });
    const data_b = await getBrokersList();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    sheet.columns = [
      { header: "broker", key: "broker", width: 25 },
      { header: "Email", key: "email_b", width: 30 },
      { header: "Phone", key: "number_b", width: 20 },
      { header: "Status", key: "status_b", width: 15 },
      { header: "dob", key: "dob_b", width: 15 },
      { header: "address", key: "address_b", width: 20 },
      { header: "pincode", key: "pincode", width: 20 },
      { header: "district", key: "district", width: 20 },
      { header: "state", key: "state", width: 20 },
      { header: "Broker_id", key: "broker_id_b", width: 20},
      { header: "clients", key: "clients", width: 20},
      { header: "Created", key: "createdAt_b", width: 20 },
      { header: "        ", key: "", width: 20 },
      { header: "Client", key: "client", width: 25 },
      { header: "Email", key: "email_c", width: 30 },
      { header: "Phone", key: "number_c", width: 20 },
      { header: "Status", key: "status_c", width: 15 },
      { header: "dob", key: "dob_c", width: 15 },
      { header: "address", key: "address_c", width: 20 },
      { header: "Broker_id", key: "broker_id_c", width: 20},
      { header: "Created", key: "createdAt_c", width: 20 }
    ];

    data_b.forEach((item) => {

      const row = sheet.addRow({
        broker: item.name,
        email_b: item.email,
        number_b: item.number,
        status_b: item.status,
        dob_b: item.dob,
        address_b: item.address,
        pincode: item.pincode,
        district: item.district,
        state: item.state,
        broker_id_b: item.brokerId,
        clients: item.clients ? item.clients.length : 0,
        createdAt_b: item.createdAt
      });

      const update = new Date(item.statusUpdatedAt)
      if (update >= start && update <= end && item.statusUpdatedAt !== item.createdAt) {

          if (item.status === "approved") {
            row.getCell("status_b").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "C6EFCE" }
            };
          }

          if (item.status === "rejected") {
            row.getCell("status_b").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC7CE" }
            };
          }
      }
    });

    data_c.forEach((item) => {
      const statusName = item.Status ? item.Status.name : "applied";
      const row = sheet.addRow({
        client: item.Borrower?.user ? item.Borrower?.user.name : "Unknown",
        email_c: item.Borrower?.user ? item.Borrower?.user.email : "-",
        number_c: item.Borrower?.user ? item.Borrower?.user.mob_no : "-",
        status_c: statusName,
        dob_c: "-",
        address_c: "-",
        broker_id_c: item.partner_id || "direct",
        createdAt_c: item.createdAt
      });
      const update = new Date(item.updatedAt)
      if (update >= start && update <= end && item.updatedAt !== item.createdAt) {

          if (statusName === "disbursed") {
            row.getCell("status_c").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "C6EFCE" }
            };
          }

          if (statusName === "credit") {
            row.getCell("status_c").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC7CE" }
            };
          }
      }
    });  

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=report.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
    }
};

/* -----------------------------------------------------
   ADMIN – RELATIONSHIP MANAGER DETAILS
----------------------------------------------------- */
export const getRelationshipManager = async (req, res) => {
  try {
    let rm = await RelationshipManager.findOne();
    if (!rm) {
      rm = await RelationshipManager.create({
        name: "Rishabh Mathur",
        role: "Manager Mortgages",
        mob: "99105 07574",
        email: "support@finn4sure.com",
        availability: "Mon-Sat 9:30 AM–6:30 PM IST"
      });
    }
    res.json(rm);
  } catch (err) {
    console.error("Get RM error:", err);
    res.status(500).json({ message: "Failed to fetch relationship manager" });
  }
};

export const updateRelationshipManager = async (req, res) => {
  try {
    const { name, role, mob, email, availability } = req.body;
    let rm = await RelationshipManager.findOne();
    if (!rm) {
      rm = await RelationshipManager.create({
        name,
        role,
        mob,
        email,
        availability
      });
    } else {
      await rm.update({ name, role, mob, email, availability });
    }
    res.json(rm);
  } catch (err) {
    console.error("Update RM error:", err);
    res.status(500).json({ message: "Failed to update relationship manager" });
  }
};

/* -----------------------------------------------------
   ADMIN – ACCESS DETAILS
----------------------------------------------------- */
export const getAdminAccessDetails = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({
      username: admin.email,
      lastLogin: admin.lastLogin,
      sessionStatus: admin.sessionStatus
    });
  } catch (err) {
    console.error("Get Admin Access details error:", err);
    res.status(500).json({ message: "Failed to fetch admin access details" });
  }
};

/* -----------------------------------------------------
   ADMIN – ALL CLIENTS (BORROWERS)
----------------------------------------------------- */
export const allClients = async (req, res) => {
  try {
    let clients = await User.findAll({
      where: {
        [Op.or]: [{ role_id: 1 }, { role_id: "1" }, { role_id: null }]
      },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    if (!clients || clients.length === 0) {
      const borrowers = await Borrower.findAll({ raw: true });
      const bUserIds = borrowers.map(b => b.user_id).filter(Boolean);
      if (bUserIds.length > 0) {
        clients = await User.findAll({ where: { id: bUserIds }, raw: true });
      }
    }

    // Pre-load all statuses and lenders once
    let allStatuses = [];
    let allLenders = [];
    try { allStatuses = await Status.findAll({ raw: true }); } catch (_) {}
    try { allLenders = await Lender.findAll({ raw: true }); } catch (_) {}
    const statusMap = new Map(allStatuses.map(s => [s.id, s.name || '']));
    const lenderMap = new Map(allLenders.map(l => [l.id, l.name || '']));

    // Stage priority for bestStage calculation
    const STAGE_PRIORITY = ['Disbursed', 'Sanction', 'Legal', 'Submitted', 'Credit', 'Docs', 'Applied'];

    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        let applications = [];
        let borrower = null;
        try {
          borrower = await Borrower.findOne({ where: { user_id: client.id }, raw: true });
          if (borrower) {
            applications = await Loan_Application.findAll({
              where: { borrower_id: borrower.id },
              order: [['createdAt', 'DESC']],
              raw: true
            });
          }
        } catch (_) {}

        const loanCount = applications.length;
        let clientStatus = client.status || 'active';
        let bestStage = 'Applied';
        let appliedLender = '-';

        if (loanCount > 0) {
          const appStatuses = applications.map(app => ({
            name: app.status_id ? (statusMap.get(app.status_id) || 'Applied') : 'Applied',
            lenderId: app.lender_id
          }));

          // Compute best stage (highest progress)
          for (const stage of STAGE_PRIORITY) {
            if (appStatuses.some(s => s.name.toLowerCase() === stage.toLowerCase())) {
              bestStage = stage;
              break;
            }
          }

          // Compute client status from statuses
          const stNames = appStatuses.map(s => s.name.toLowerCase());
          const allRejected = stNames.length > 0 && stNames.every(st => st === 'rejected');
          const noActive = stNames.length > 0 && stNames.every(st => ['disbursed', 'completed', 'rejected'].includes(st));
          if (allRejected) clientStatus = 'rejected';
          else if (noActive) clientStatus = 'inactive';

          // Get all unique lenders across all applications for this borrower
          const lenderNames = [];
          for (const a of applications) {
            if (a.lender_id && lenderMap.has(a.lender_id)) {
              const lName = lenderMap.get(a.lender_id);
              if (lName && !lenderNames.includes(lName)) lenderNames.push(lName);
            }
          }
          if (lenderNames.length > 0) {
            appliedLender = lenderNames.join(', ');
          }
        }

        return {
          id: client.id,
          name: client.name || '-',
          email: client.email || '-',
          number: client.mob_no || client.number || '-',
          status: clientStatus,
          loanCount,
          bestStage,
          appliedLender,
          borrowerId: borrower ? borrower.id : null,
          createdAt: client.createdAt
        };
      })
    );
    res.json(enrichedClients);
  } catch (e) {
    console.error("allClients error:", e);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
};

/* -----------------------------------------------------
   ADMIN – CLIENT LOANS LIST
----------------------------------------------------- */
export const getClientLoans = async (req, res) => {
  try {
    const { userId } = req.params;

    // Pre-load statuses & lenders
    let allStatuses = [];
    let allLenders = [];
    let allLoanTypes = [];
    try { allStatuses = await Status.findAll({ raw: true }); } catch (_) {}
    try { allLenders = await Lender.findAll({ raw: true }); } catch (_) {}
    try { allLoanTypes = await LoanType.findAll({ raw: true }); } catch (_) {}

    const statusMap = new Map(allStatuses.map(s => [s.id, s.name]));
    const lenderMap = new Map(allLenders.map(l => [l.id, l.name || l.bank_name]));
    const loanTypeMap = new Map(allLoanTypes.map(lt => [lt.id, lt.name]));

    const borrower = await Borrower.findOne({ where: { user_id: userId }, raw: true });
    if (!borrower) return res.json([]);

    const applications = await Loan_Application.findAll({
      where: { borrower_id: borrower.id },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const loans = applications.map(app => ({
      id: app.id,
      application_no: app.application_no ? `F4S-${app.application_no}` : `F4S-${2000 + app.id}`,
      loanType: loanTypeMap.get(app.loan_type_id) || 'Home Loan',
      loanAmount: app.loan_amount || 0,
      lender: lenderMap.get(app.lender_id) || '-',
      status: statusMap.get(app.status_id) || 'Applied',
      tenure: app.tenure || '-',
      createdAt: app.createdAt
    }));

    res.json(loans);
  } catch (e) {
    console.error("getClientLoans error:", e);
    res.status(500).json({ message: "Failed to fetch client loans" });
  }
};

/* -----------------------------------------------------
   ADMIN – TIMELINE ACTIVITY FEED
----------------------------------------------------- */
export const timelineActivity = async (req, res) => {
  try {
    const applications = await Loan_Application.findAll({
      limit: 20,
      order: [['updatedAt', 'DESC']],
      raw: true
    });
    
    const timeline = await Promise.all(applications.map(async (app) => {
      let borrowerName = "Unknown";
      if (app.borrower_id) {
        try {
          const borrowerObj = await Borrower.findByPk(app.borrower_id, { raw: true });
          if (borrowerObj && borrowerObj.user_id) {
            const uObj = await User.findByPk(borrowerObj.user_id, { raw: true });
            if (uObj) borrowerName = uObj.name;
          }
        } catch (_) {}
      }

      if (borrowerName === "Unknown" && app.loan_purpose) {
        const parts = app.loan_purpose.split(/ \u2014 | \u2013 | - /);
        if (parts[1]) {
          const subParts = parts[1].split(' (');
          if (subParts[0]) borrowerName = subParts[0].trim();
        }
      }

      let productName = "Home Loan";
      if (app.loan_type_id) {
        try {
          const ltObj = await LoanType.findByPk(app.loan_type_id, { raw: true });
          if (ltObj) productName = ltObj.name;
        } catch (_) {}
      }

      let statusName = "pending";
      if (app.status_id) {
        try {
          const sObj = await Status.findByPk(app.status_id, { raw: true });
          if (sObj) statusName = sObj.name.toLowerCase();
        } catch (_) {}
      }

      return {
        id: app.id,
        borrower: borrowerName,
        product: productName,
        status: statusName,
        date: app.updatedAt
      };
    }));

    res.json(timeline);
  } catch (err) {
    console.error("Timeline error:", err);
    res.json([]);
  }
};

/* -----------------------------------------------------
   ADMIN – LENDER INTEREST RATES HELPER
----------------------------------------------------- */
export const getLenderRatesHelper = async (loanTypeShortId = 'HL') => {
  let loanTypeId = 1;
  if (loanTypeShortId) {
    try {
      const lt = await LoanType.findOne({ 
        where: { short_id: loanTypeShortId } 
      });
      if (lt) loanTypeId = lt.id;
    } catch (_) {}
  }

  let lenders = [];
  try {
    lenders = await Lender.findAll({
      order: [['name', 'ASC']],
      raw: true
    });
  } catch (_) {}

  if (!lenders || lenders.length === 0) {
    try {
      lenders = await Bank.findAll({ raw: true });
    } catch (_) {}
  }

  if (!lenders || lenders.length === 0) {
    lenders = [
      { id: 1, name: 'SBI', type: 'PSU', offer: 'Zero PF on home' },
      { id: 2, name: 'HDFC Bank', type: 'Private', offer: 'Pre-approved off' },
      { id: 3, name: 'ICICI Bank', type: 'Private', offer: 'Instant in-princip' },
      { id: 4, name: 'Axis Bank', type: 'Private', offer: 'Offer text' },
      { id: 5, name: 'Kotak Mahindra', type: 'Private', offer: 'Offer text' },
      { id: 6, name: 'Bajaj Finserv', type: 'NBFC/HFC', offer: 'Pre-approved pei' },
      { id: 7, name: 'PNB Housing', type: 'NBFC/HFC', offer: 'Offer text' },
      { id: 8, name: 'LIC Housing', type: 'NBFC/HFC', offer: 'Griha Lakshmi Sp' },
      { id: 9, name: 'Tata Capital', type: 'NBFC/HFC', offer: 'Digital home loan' },
      { id: 10, name: 'Bank of Baroda', type: 'PSU', offer: 'Offer text' }
    ];
  }

  const categoryPresets = {
    HL: {
      1: { flowLow: "7.10", flowHigh: "9.65", fixLow: "8.70", fixHigh: "11.20", offer: "Zero PF on home" },
      2: { flowLow: "7.20", flowHigh: "9.80", fixLow: "8.80", fixHigh: "11.50", offer: "Pre-approved off" },
      3: { flowLow: "7.25", flowHigh: "9.90", fixLow: "8.90", fixHigh: "11.60", offer: "Instant in-princip" },
      4: { flowLow: "7.30", flowHigh: "10.00", fixLow: "9.00", fixHigh: "11.70", offer: "Special concession" },
      5: { flowLow: "7.40", flowHigh: "9.75", fixLow: "9.00", fixHigh: "11.50", offer: "Reduced processing fee" },
      6: { flowLow: "7.25", flowHigh: "10.50", fixLow: "9.00", fixHigh: "12.00", offer: "Pre-approved pei" },
      7: { flowLow: "7.50", flowHigh: "13.45", fixLow: "9.00", fixHigh: "14.00", offer: "Custom tenure plans" },
      8: { flowLow: "7.50", flowHigh: "10.35", fixLow: "9.50", fixHigh: "12.00", offer: "Griha Lakshmi Sp" },
      9: { flowLow: "8.50", flowHigh: "11.00", fixLow: "9.50", fixHigh: "12.00", offer: "Digital home loan" },
      10: { flowLow: "7.10", flowHigh: "9.60", fixLow: "8.60", fixHigh: "11.10", offer: "Zero processing fee" }
    },
    PL: {
      1: { flowLow: "10.50", flowHigh: "14.50", fixLow: "11.50", fixHigh: "15.50", offer: "Quick 10-min approval" },
      2: { flowLow: "10.75", flowHigh: "15.00", fixLow: "11.75", fixHigh: "16.00", offer: "Pre-approved salary offer" },
      3: { flowLow: "10.65", flowHigh: "14.75", fixLow: "11.65", fixHigh: "15.75", offer: "Instant disbursement" },
      4: { flowLow: "10.99", flowHigh: "15.50", fixLow: "12.00", fixHigh: "16.50", offer: "Zero documentation charge" },
      5: { flowLow: "10.90", flowHigh: "15.25", fixLow: "11.90", fixHigh: "16.25", offer: "Flexible repayment tenure" },
      6: { flowLow: "11.50", flowHigh: "16.50", fixLow: "12.50", fixHigh: "18.00", offer: "No collateral required" },
      7: { flowLow: "11.75", flowHigh: "16.00", fixLow: "12.75", fixHigh: "17.50", offer: "Low EMI options" },
      8: { flowLow: "11.25", flowHigh: "15.50", fixLow: "12.25", fixHigh: "16.75", offer: "Special staff ROI" },
      9: { flowLow: "11.99", flowHigh: "17.00", fixLow: "13.00", fixHigh: "18.50", offer: "100% digital process" },
      10: { flowLow: "10.40", flowHigh: "14.25", fixLow: "11.40", fixHigh: "15.25", offer: "Minimal documentation" }
    },
    BL: {
      1: { flowLow: "11.25", flowHigh: "16.00", fixLow: "12.50", fixHigh: "17.25", offer: "Working capital special" },
      2: { flowLow: "11.50", flowHigh: "16.50", fixLow: "12.75", fixHigh: "17.75", offer: "Collateral free up to 50L" },
      3: { flowLow: "11.40", flowHigh: "16.25", fixLow: "12.60", fixHigh: "17.50", offer: "MSME growth loan" },
      4: { flowLow: "11.75", flowHigh: "17.00", fixLow: "13.00", fixHigh: "18.25", offer: "Overdraft facility" },
      5: { flowLow: "11.90", flowHigh: "17.25", fixLow: "13.15", fixHigh: "18.50", offer: "Custom EMI schedule" },
      6: { flowLow: "12.50", flowHigh: "18.50", fixLow: "13.75", fixHigh: "19.75", offer: "Fast track 48hr disbursal" },
      7: { flowLow: "12.75", flowHigh: "18.00", fixLow: "14.00", fixHigh: "19.50", offer: "Machinery finance discount" },
      8: { flowLow: "12.00", flowHigh: "17.50", fixLow: "13.25", fixHigh: "18.75", offer: "Low processing fee" },
      9: { flowLow: "13.00", flowHigh: "19.50", fixLow: "14.50", fixHigh: "21.00", offer: "Unsecured business loan" },
      10: { flowLow: "11.10", flowHigh: "15.75", fixLow: "12.10", fixHigh: "16.75", offer: "Mudra & MSME scheme" }
    },
    VL: {
      1: { flowLow: "8.75", flowHigh: "11.00", fixLow: "9.50", fixHigh: "12.00", offer: "100% on-road funding" },
      2: { flowLow: "8.85", flowHigh: "11.25", fixLow: "9.65", fixHigh: "12.25", offer: "Zero foreclosure charges" },
      3: { flowLow: "8.80", flowHigh: "11.15", fixLow: "9.60", fixHigh: "12.15", offer: "Pre-approved car loan" },
      4: { flowLow: "8.99", flowHigh: "11.50", fixLow: "9.85", fixHigh: "12.50", offer: "Instant approval on app" },
      5: { flowLow: "9.10", flowHigh: "11.75", fixLow: "9.95", fixHigh: "12.75", offer: "EV vehicle discount" },
      6: { flowLow: "9.25", flowHigh: "12.50", fixLow: "10.25", fixHigh: "13.50", offer: "Used car finance offer" },
      7: { flowLow: "9.50", flowHigh: "12.75", fixLow: "10.50", fixHigh: "13.75", offer: "Commercial vehicle special" },
      8: { flowLow: "9.00", flowHigh: "11.80", fixLow: "9.90", fixHigh: "12.80", offer: "Low EMI tenure" },
      9: { flowLow: "9.75", flowHigh: "13.00", fixLow: "10.75", fixHigh: "14.00", offer: "Two-wheeler instant loan" },
      10: { flowLow: "8.70", flowHigh: "10.90", fixLow: "9.40", fixHigh: "11.90", offer: "Baroda auto loan scheme" }
    },
    LAP: {
      1: { flowLow: "9.25", flowHigh: "12.00", fixLow: "10.25", fixHigh: "13.00", offer: "High LTV ratio funding" },
      2: { flowLow: "9.50", flowHigh: "12.25", fixLow: "10.50", fixHigh: "13.25", offer: "Commercial property LAP" },
      3: { flowLow: "9.40", flowHigh: "12.15", fixLow: "10.40", fixHigh: "13.15", offer: "Residential LAP discount" },
      4: { flowLow: "9.65", flowHigh: "12.50", fixLow: "10.65", fixHigh: "13.50", offer: "Balance transfer + Topup" },
      5: { flowLow: "9.75", flowHigh: "12.75", fixLow: "10.75", fixHigh: "13.75", offer: "Flexible repayment plan" },
      6: { flowLow: "10.25", flowHigh: "13.50", fixLow: "11.25", fixHigh: "14.50", offer: "High value LAP disbursal" },
      7: { flowLow: "10.50", flowHigh: "13.75", fixLow: "11.50", fixHigh: "14.75", offer: "Industrial property LAP" },
      8: { flowLow: "9.60", flowHigh: "12.30", fixLow: "10.60", fixHigh: "13.30", offer: "Low documentation fee" },
      9: { flowLow: "10.75", flowHigh: "14.00", fixLow: "11.75", fixHigh: "15.00", offer: "Fast legal valuation" },
      10: { flowLow: "9.15", flowHigh: "11.85", fixLow: "10.15", fixHigh: "12.85", offer: "Special PSU LAP rates" }
    }
  };

  const selectedPresets = categoryPresets[loanTypeShortId] || categoryPresets.HL;

  return await Promise.all(
    lenders.map(async (lender, idx) => {
      let floatRate = null;
      let fixedRate = null;
      try {
        floatRate = await LenderLoanRates.findOne({
          where: { lender_id: lender.id, loan_type_id: loanTypeId, rate_type: 'floating' },
          raw: true
        });
        fixedRate = await LenderLoanRates.findOne({
          where: { lender_id: lender.id, loan_type_id: loanTypeId, rate_type: 'fixed' },
          raw: true
        });
      } catch (_) {}

      const preset = selectedPresets[lender.id || (idx + 1)] || { flowLow: "8.5", flowHigh: "11.0", fixLow: "9.5", fixHigh: "12.0", offer: "Special interest rate offer" };

      return {
        lenderId: lender.id,
        name: lender.name || lender.bank_name || 'Bank',
        type: lender.type || "Private",
        flowLow: floatRate ? String(floatRate.min_rate) : preset.flowLow,
        flowHigh: floatRate ? String(floatRate.max_rate) : preset.flowHigh,
        fixLow: fixedRate ? String(fixedRate.min_rate) : preset.fixLow,
        fixHigh: fixedRate ? String(fixedRate.max_rate) : preset.fixHigh,
        offer: floatRate?.offer || fixedRate?.offer || lender.offer || preset.offer || "Special interest rate offer",
        visible: true
      };
    })
  );
};

export const getLenderRates = async (req, res) => {
  try {
    const { loanTypeShortId = 'HL' } = req.query;
    const rates = await getLenderRatesHelper(loanTypeShortId);
    res.json(rates);
  } catch (err) {
    console.error("Get rates error:", err);
    res.status(500).json({ message: "Failed to fetch lender rates" });
  }
};

export const updateLenderRates = async (req, res) => {
  try {
    const { rates, loanTypeShortId } = req.body;
    
    let loanTypeId = 1;
    if (loanTypeShortId) {
      const lt = await LoanType.findOne({ where: { short_id: loanTypeShortId } });
      if (lt) loanTypeId = lt.id;
    }

    for (const r of rates) {
      const [floatRate, createdFloat] = await LenderLoanRates.findOrCreate({
        where: { lender_id: r.lenderId, loan_type_id: loanTypeId, rate_type: 'floating' },
        defaults: {
          min_rate: parseFloat(r.flowLow) || 8.5,
          max_rate: parseFloat(r.flowHigh) || 11.0,
          offer: r.offer,
          processing_fee: 0,
          max_tenure: 30,
          max_amount: 10000000,
          effective_from: new Date()
        }
      });
      if (!createdFloat) {
        await floatRate.update({
          min_rate: parseFloat(r.flowLow) || 8.5,
          max_rate: parseFloat(r.flowHigh) || 11.0,
          offer: r.offer
        });
      }

      const [fixedRate, createdFixed] = await LenderLoanRates.findOrCreate({
        where: { lender_id: r.lenderId, loan_type_id: loanTypeId, rate_type: 'fixed' },
        defaults: {
          min_rate: parseFloat(r.fixLow) || 9.5,
          max_rate: parseFloat(r.fixHigh) || 12.0,
          offer: r.offer,
          processing_fee: 0,
          max_tenure: 30,
          max_amount: 10000000,
          effective_from: new Date()
        }
      });
      if (!createdFixed) {
        await fixedRate.update({
          min_rate: parseFloat(r.fixLow) || 9.5,
          max_rate: parseFloat(r.fixHigh) || 12.0,
          offer: r.offer
        });
      }
    }

    res.json({ message: "Lender rates updated successfully" });
  } catch (err) {
    console.error("Update rates error:", err);
    res.status(500).json({ message: "Failed to update lender rates" });
  }
};

/* -----------------------------------------------------
   ADMIN – GET ALL SETTINGS
----------------------------------------------------- */
export const getPlatformSettings = async (req, res) => {
  try {
    const settings = await PlatformSetting.findAll({ raw: true });
    
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    res.json({
      roi_disclaimer: settingsObj.roi_disclaimer || "Final ROI will be confirmed post credit assessment of the case.",
      announcement_banner: settingsObj.announcement_banner || "",
      disbursed_stat: settingsObj.disbursed_stat || "₹100Cr+",
      borrowers_stat: settingsObj.borrowers_stat || "350+",
      partners_stat: settingsObj.partners_stat || "100+",
      rating_stat: settingsObj.rating_stat || "4.8★"
    });
  } catch (err) {
    console.error("Get platform settings error:", err);
    res.status(500).json({ message: "Failed to fetch platform settings" });
  }
};

/* -----------------------------------------------------
   ADMIN – SAVE PLATFORM SETTINGS
----------------------------------------------------- */
export const updatePlatformSettings = async (req, res) => {
  try {
    const settingsData = req.body;
    
    for (const [key, value] of Object.entries(settingsData)) {
      const [setting, created] = await PlatformSetting.findOrCreate({
        where: { key },
        defaults: { value: String(value) }
      });
      if (!created) {
        await setting.update({ value: String(value) });
      }
    }

    res.json({ message: "Platform settings updated successfully" });
  } catch (err) {
    console.error("Update platform settings error:", err);
    res.status(500).json({ message: "Failed to update platform settings" });
  }
};

/* -----------------------------------------------------
   ADMIN – SINGLE BATCH DASHBOARD BUNDLE
----------------------------------------------------- */
export const getDashboardBundle = async (req, res) => {
  try {
    let statsData = {};
    try {
      const totalClients = await User.count({ where: { role_id: 1 } });
      const totalBrokers = await User.count({ where: { role_id: 2 } });
      const approvedBrokers = await User.count({ where: { role_id: 2, status: "active" } });
      const pendingBrokers = await User.count({ where: { role_id: 2, status: "pending verification" } });
      const totalLenders = await Lender.count();
      const totalApplications = await Loan_Application.count();

      let inProgressCount = 0;
      let completedCount = 0;
      let rejectedCount = 0;
      let pendingCount = 0;
      let loanVolume = 0;
      let disbursedAmount = 0;

      try {
        const allApps = await Loan_Application.findAll({ raw: true });
        loanVolume = allApps.reduce((acc, curr) => acc + (parseFloat(curr.loan_amount) || 0), 0);

        const allStatuses = await Status.findAll({ raw: true });
        const statusMap = new Map(allStatuses.map(s => [s.id, s.name ? s.name.toLowerCase() : '']));

        for (const app of allApps) {
          const stName = statusMap.get(app.status_id) || 'applied';
          if (['disbursed', 'completed'].includes(stName)) {
            completedCount++;
            disbursedAmount += (parseFloat(app.loan_amount) || 0);
          } else if (stName === 'rejected') {
            rejectedCount++;
          } else if (['applied', 'pending'].includes(stName)) {
            pendingCount++;
          } else {
            inProgressCount++;
          }
        }
      } catch (_) {}

      const topLenders = await getTopLendersHelper();

      statsData = {
        totalUsers: totalClients + totalBrokers,
        totalClients,
        totalBrokers,
        approvedBrokers,
        pendingBrokers,
        totalLenders,
        totalApplications,
        inProgressCount,
        completedCount,
        rejectedCount,
        pendingCount,
        loanVolume,
        disbursedAmount,
        activeBorrowers: totalClients,
        activePartners: approvedBrokers,
        borrowers: totalClients,
        leads: totalApplications,
        brokers: totalBrokers,
        rating: "5.0",
        topLenders
      };
    } catch (_) {}

    let leadsData = [];
    try {
      const applications = await Loan_Application.findAll({
        order: [['createdAt', 'DESC']],
        raw: true
      });
      leadsData = await Promise.all(applications.map(async (app) => {
        let clientName = null;
        let clientEmail = "-";
        let clientPhone = "-";
        let clientAddress = "-";
        let clientState = "-";
        let clientDistrict = "-";
        let clientDob = "-";

        if (app.borrower_id) {
          try {
            const borrowerObj = await Borrower.findByPk(app.borrower_id, { raw: true });
            if (borrowerObj) {
              clientAddress = borrowerObj.address || "-";
              clientState = borrowerObj.state || "-";
              clientDistrict = borrowerObj.district || "-";
              clientDob = borrowerObj.dob || "-";
              if (borrowerObj.user_id) {
                const uObj = await User.findByPk(borrowerObj.user_id, { raw: true });
                if (uObj) {
                  clientName = uObj.name;
                  clientEmail = uObj.email || "-";
                  clientPhone = uObj.mob_no || "-";
                }
              }
            }
          } catch (_) {}
        }

        if (!clientName && app.loan_purpose) {
          const parts = app.loan_purpose.split(/ \u2014 | \u2013 | - /);
          if (parts[1]) {
            const subParts = parts[1].split(' (');
            clientName = subParts[0] ? subParts[0].trim() : null;
            if (subParts[1]) {
              clientPhone = subParts[1].replace(')', '').trim();
            }
          }
        }

        if (!clientName) clientName = `Application #${app.id}`;

        let loanTypeName = "Home Loan";
        if (app.loan_type_id) {
          try {
            const ltObj = await LoanType.findByPk(app.loan_type_id, { raw: true });
            if (ltObj) loanTypeName = ltObj.name;
          } catch (_) {}
        }

        let statusName = "in-progress";
        let stageName = "Applied";
        if (app.status_id) {
          try {
            const sObj = await Status.findByPk(app.status_id, { raw: true });
            if (sObj) {
              const lowerSt = sObj.name.toLowerCase().trim();
              stageName = sObj.name;
              statusName = ['disbursed', 'completed'].includes(lowerSt)
                ? 'disbursed'
                : lowerSt === 'rejected'
                ? 'rejected'
                : 'in-progress';
            }
          } catch (_) {}
        }

        let lenderName = app.client_preference || "SBI";
        if (app.lender_id) {
          try {
            const lObj = await Lender.findByPk(app.lender_id, { raw: true });
            if (lObj) lenderName = lObj.short_name || lObj.name;
          } catch (_) {}
        }

        let partnerName = null;
        if (app.partner_id) {
          try {
            const pObj = await Partner.findByPk(app.partner_id, { raw: true });
            if (pObj && pObj.user_id) {
              const puObj = await User.findByPk(pObj.user_id, { raw: true });
              if (puObj) partnerName = puObj.name;
            }
          } catch (_) {}
        }

        const formattedAppNo = app.application_no 
          ? (String(app.application_no).startsWith('F4S') ? app.application_no : `F4S-${app.application_no}`) 
          : `F4S-${2000 + app.id}`;

        return {
          id: app.id,
          application_no: formattedAppNo,
          name: clientName,
          email: clientEmail,
          number: clientPhone,
          address: clientAddress,
          state: clientState,
          district: clientDistrict,
          dob: clientDob,
          product: loanTypeName,
          status: statusName,
          stage: stageName,
          lender: lenderName,
          source: partnerName ? partnerName : "Direct",
          client_preference: app.client_preference,
          partner_id: app.partner_id,
          partner_name: partnerName,
          loan_amount: app.loan_amount,
          tenure: app.tenure,
          loan_purpose: app.loan_purpose,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt
        };
      }));
    } catch (_) {}

    let brokersData = [];
    try {
      brokersData = await getBrokersList();
    } catch (_) {}

    let clientsData = [];
    try {
      const clients = await User.findAll({
        where: { role_id: 1 },
        order: [['createdAt', 'DESC']],
        raw: true
      });

      // Pre-load all statuses and lenders once
      let allStatusesC = [];
      let allLendersC = [];
      try { allStatusesC = await Status.findAll({ raw: true }); } catch (_) {}
      try { allLendersC = await Lender.findAll({ raw: true }); } catch (_) {}
      const statusMapC = new Map(allStatusesC.map(s => [s.id, s.name || '']));
      const lenderMapC = new Map(allLendersC.map(l => [l.id, l.name || l.bank_name || '']));
      const STAGE_PRIORITY = ['Disbursed', 'Sanction', 'Legal', 'Submitted', 'Credit', 'Docs', 'Applied'];

      clientsData = await Promise.all(
        clients.map(async (client) => {
          let applications = [];
          let borrower = null;
          try {
            borrower = await Borrower.findOne({ where: { user_id: client.id }, raw: true });
            if (borrower) {
              applications = await Loan_Application.findAll({
                where: { borrower_id: borrower.id },
                order: [['createdAt', 'DESC']],
                raw: true
              });
            }
          } catch (_) {}

          const loanCount = applications.length;
          let clientStatus = client.status || 'active';
          let bestStage = 'Applied';
          let appliedLender = '-';

          if (loanCount > 0) {
            const appStatuses = applications.map(app => ({
              name: app.status_id ? (statusMapC.get(app.status_id) || 'Applied') : 'Applied',
              lenderId: app.lender_id
            }));

            // Best stage (highest progress)
            for (const stage of STAGE_PRIORITY) {
              if (appStatuses.some(s => s.name.toLowerCase() === stage.toLowerCase())) {
                bestStage = stage;
                break;
              }
            }

            // Client status
            const stNames = appStatuses.map(s => s.name.toLowerCase());
            const allRejected = stNames.length > 0 && stNames.every(st => st === 'rejected');
            const noActive = stNames.length > 0 && stNames.every(st => ['disbursed', 'completed', 'rejected'].includes(st));
            if (allRejected) clientStatus = 'rejected';
            else if (noActive) clientStatus = 'inactive';

            // Get all unique lenders across all applications for this borrower
            const lenderNames = [];
            for (const a of applications) {
              if (a.lender_id && lenderMapC.has(a.lender_id)) {
                const lName = lenderMapC.get(a.lender_id);
                if (lName && !lenderNames.includes(lName)) lenderNames.push(lName);
              }
            }
            if (lenderNames.length > 0) {
              appliedLender = lenderNames.join(', ');
            }
          }

          return {
            id: client.id,
            name: client.name || '-',
            email: client.email || '-',
            number: client.mob_no || client.number || '-',
            status: clientStatus,
            loanCount,
            bestStage,
            appliedLender,
            borrowerId: borrower ? borrower.id : null,
            createdAt: client.createdAt
          };
        })
      );
    } catch (_) {}

    let timelineData = [];
    try {
      const timelineApps = await Loan_Application.findAll({
        limit: 20,
        order: [['updatedAt', 'DESC']],
        raw: true
      });
      timelineData = await Promise.all(timelineApps.map(async (app) => {
        let borrowerName = "Unknown";
        if (app.borrower_id) {
          try {
            const borrowerObj = await Borrower.findByPk(app.borrower_id, { raw: true });
            if (borrowerObj && borrowerObj.user_id) {
              const uObj = await User.findByPk(borrowerObj.user_id, { raw: true });
              if (uObj) borrowerName = uObj.name;
            }
          } catch (_) {}
        }
        if (borrowerName === "Unknown" && app.loan_purpose) {
          const parts = app.loan_purpose.split(/ \u2014 | \u2013 | - /);
          if (parts[1]) {
            const subParts = parts[1].split(' (');
            if (subParts[0]) borrowerName = subParts[0].trim();
          }
        }
        let productName = "Home Loan";
        if (app.loan_type_id) {
          try {
            const ltObj = await LoanType.findByPk(app.loan_type_id, { raw: true });
            if (ltObj) productName = ltObj.name;
          } catch (_) {}
        }
        let statusName = "pending";
        if (app.status_id) {
          try {
            const sObj = await Status.findByPk(app.status_id, { raw: true });
            if (sObj) statusName = sObj.name.toLowerCase();
          } catch (_) {}
        }
        return {
          id: app.id,
          borrower: borrowerName,
          product: productName,
          status: statusName,
          date: app.updatedAt
        };
      }));
    } catch (_) {}

    let ratesData = [];
    try {
      ratesData = await getLenderRatesHelper('HL');
    } catch (_) {}

    res.json({
      stats: statsData,
      leads: leadsData,
      brokers: brokersData,
      clients: clientsData,
      timeline: timelineData,
      rates: ratesData
    });
  } catch (err) {
    console.error("getDashboardBundle error:", err);
    res.json({
      stats: {},
      leads: [],
      brokers: [],
      clients: [],
      timeline: [],
      rates: []
    });
  }
};