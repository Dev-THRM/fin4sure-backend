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

//const User = UserInit(sequelize, DataTypes);
import Borrower from "../models/borrower.js";

const getBrokersList = async () => {
  const users = await User.findAll({
    where: { role_id: 2 },
    attributes: { exclude: ['password_hash'] },
    raw: true
  });

  return await Promise.all(
    users.map(async (user) => {
      const partner = await Partner.findOne({
        where: { user_id: user.id },
        include: [{ model: City, as: 'city' }]
      });
      const cityName = partner && partner.city ? partner.city.name : "";
      const partnerIdVal = partner ? partner.id : null;
      console.log(`DEBUG: broker user_id=${user.id}, partnerIdVal=${partnerIdVal}`);

      // 1. (Legacy clients table removed)

      // 2. Get referred applications to extract real client details
      const referredApps = partnerIdVal ? await Loan_Application.findAll({
        where: { partner_id: partnerIdVal }
      }) : [];

      const clientsFromApps = await Promise.all(referredApps.map(async (app) => {
        let clientName = null;
        let clientEmail = null;
        let clientPhone = null;

        // 1. Try fetching real client data from borrower -> user association
        if (app.borrower_id) {
          const borrowerObj = await Borrower.findByPk(app.borrower_id, {
            include: [{ model: User, as: 'user' }]
          });
          if (borrowerObj && borrowerObj.user) {
            clientName = borrowerObj.user.name;
            clientEmail = borrowerObj.user.email;
            clientPhone = borrowerObj.user.mob_no;
          }
        }

        // 2. Fallback to loan_purpose parsing if borrower lookup failed
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

        if (!clientName) return null;

        // Don't show partner themselves as their own client
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
        status: user.status,
        dob: partner ? partner.dob || "1990-01-01" : "1990-01-01",
        address: partner ? partner.address || cityName : cityName,
        state: "India",
        district: cityName,
        pincode: "000000",
        clients: linkedClients,
        clientCount: linkedClients.length,
        leadCount: countLeads,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        statusUpdatedAt: user.updatedAt
      };
    })
  );
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

    // Application status counts from real DB
    const totalApplications = await Loan_Application.count();

    const inProgressStatuses = await sequelize.query(`
      SELECT COUNT(la.id) as count
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE s.name IN ('applied','docs','credit','submitted','sanction','legal','in-progress')
    `, { type: sequelize.QueryTypes.SELECT });
    const inProgressCount = parseInt(inProgressStatuses[0]?.count || 0);

    const completedStatuses = await sequelize.query(`
      SELECT COUNT(la.id) as count
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE s.name IN ('disbursed', 'completed')
    `, { type: sequelize.QueryTypes.SELECT });
    const completedCount = parseInt(completedStatuses[0]?.count || 0);

    const rejectedStatuses = await sequelize.query(`
      SELECT COUNT(la.id) as count
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE s.name = 'rejected'
    `, { type: sequelize.QueryTypes.SELECT });
    const rejectedCount = parseInt(rejectedStatuses[0]?.count || 0);

    // Total loan volume
    const loanVolumeResult = await sequelize.query(`
      SELECT COALESCE(SUM(loan_amount), 0) as total_volume FROM loan_applications
    `, { type: sequelize.QueryTypes.SELECT });
    const loanVolume = parseFloat(loanVolumeResult[0]?.total_volume || 0);

    // Disbursed amount (sum of disbursed apps)
    const disbursedAmountResult = await sequelize.query(`
      SELECT COALESCE(SUM(la.loan_amount), 0) as disbursed_amount
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE s.name IN ('disbursed', 'completed')
    `, { type: sequelize.QueryTypes.SELECT });
    const disbursedAmount = parseFloat(disbursedAmountResult[0]?.disbursed_amount || 0);

    // Active borrowers = clients with no loans, or at least one loan that is not disbursed/completed/rejected
    const activeBorrowersResult = await sequelize.query(`
      SELECT COUNT(DISTINCT c.id) as count 
      FROM users c
      LEFT JOIN borrowers b ON c.id = b.user_id
      WHERE c.role_id = 1 AND (
        b.id IS NULL OR
        NOT EXISTS (
          SELECT 1 FROM loan_applications la WHERE la.borrower_id = b.id
        ) OR EXISTS (
          SELECT 1 FROM loan_applications la
          INNER JOIN statuses s ON la.status_id = s.id
          WHERE la.borrower_id = b.id AND s.name NOT IN ('disbursed', 'completed', 'rejected')
        )
      )
    `, { type: sequelize.QueryTypes.SELECT });
    const activeBorrowers = parseInt(activeBorrowersResult[0]?.count || 0);

    const topLenders = await sequelize.query(`
      SELECT l.name, COUNT(la.id) as count, l.type
      FROM lender_applications la
      JOIN lender_loan_rates r ON la.lender_rate_id = r.id
      JOIN lenders l ON r.lender_id = l.id
      GROUP BY l.id, l.name, l.type
      ORDER BY count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

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
      loanVolume,
      disbursedAmount,
      activeBorrowers,
      topLenders
    });
  } catch (e) {
    console.error("userCount error:", e);
    res.status(500).json({ message: "Internal server error" });
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
   ADMIN – ALL LEADS WITH FULL INFO
----------------------------------------------------- */
export const allLeads = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};
    if (status && status !== "all_statuses") {
      try {
        const statusObj = await Status.findOne({ where: { name: status } });
        if (statusObj) filter.status_id = statusObj.id;
      } catch (_) {}
    }

    const applications = await Loan_Application.findAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const enrichedLeads = await Promise.all(applications.map(async (app) => {
      let clientName = "Unknown Client";
      let clientEmail = "-";
      let clientPhone = "-";
      let clientAddress = "-";
      let clientState = "-";
      let clientDistrict = "-";
      let clientDob = "-";

      if (app.borrower_id) {
        try {
          const borrowerObj = await Borrower.findByPk(app.borrower_id);
          if (borrowerObj) {
            clientAddress = borrowerObj.address || "-";
            clientState = borrowerObj.state || "-";
            clientDistrict = borrowerObj.district || "-";
            clientDob = borrowerObj.dob || "-";
            if (borrowerObj.user_id) {
              const uObj = await User.findByPk(borrowerObj.user_id);
              if (uObj) {
                clientName = uObj.name || clientName;
                clientEmail = uObj.email || clientEmail;
                clientPhone = uObj.mob_no || clientPhone;
              }
            }
          }
        } catch (_) {}
      }

      let loanTypeName = "Home Loan";
      if (app.loan_type_id) {
        try {
          const ltObj = await LoanType.findByPk(app.loan_type_id);
          if (ltObj) loanTypeName = ltObj.name;
        } catch (_) {}
      }

      let statusName = "in progress";
      let stageName = "Applied";
      if (app.status_id) {
        try {
          const sObj = await Status.findByPk(app.status_id);
          if (sObj) {
            statusName = sObj.name.toLowerCase();
            stageName = sObj.name;
          }
        } catch (_) {}
      }

      let lenderName = "SBI";
      if (app.lender_id) {
        try {
          const lObj = await Lender.findByPk(app.lender_id);
          if (lObj) lenderName = lObj.short_name || lObj.name;
        } catch (_) {}
      }

      let partnerName = null;
      if (app.partner_id) {
        try {
          const pObj = await Partner.findByPk(app.partner_id);
          if (pObj && pObj.user_id) {
            const puObj = await User.findByPk(pObj.user_id);
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

    res.json(enrichedLeads);
  } catch (e) {
    console.error("allLeads error:", e);
    res.status(500).json({ message: "Failed to fetch leads" });
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
    const { id } = req.params;
    const { status, loan_amount, tenure, loan_purpose, loan_type_id } = req.body;

    const app = await Loan_Application.findByPk(id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    // Resolve status_id from status name if provided
    let status_id = app.status_id;
    if (status) {
      const statusObj = await Status.findOne({ where: { name: status } });
      if (!statusObj) return res.status(400).json({ message: `Unknown status: ${status}` });
      status_id = statusObj.id;
    }

    await app.update({
      status_id,
      loan_amount: loan_amount !== undefined ? parseFloat(loan_amount) : app.loan_amount,
      tenure: tenure !== undefined ? parseInt(tenure) : app.tenure,
      loan_purpose: loan_purpose !== undefined ? loan_purpose : app.loan_purpose,
      loan_type_id: loan_type_id !== undefined ? parseInt(loan_type_id) : app.loan_type_id,
    });

    const updated = await Loan_Application.findByPk(id, {
      include: [
        { model: Borrower, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'mob_no'] }] },
        { model: LoanType, as: 'loanType', attributes: ['name', 'short_id'] },
        { model: Status, attributes: ['name'] }
      ]
    });

    return res.json({
      id: updated.id,
      application_no: updated.application_no,
      name: updated.User ? updated.User.name : "Unknown",
      email: updated.User ? updated.User.email : "-",
      number: updated.User ? updated.User.mob_no : "-",
      product: updated.loanType ? updated.loanType.name : "Home Loan",
      loan_type_id: updated.loan_type_id,
      status: updated.Status ? updated.Status.name.toLowerCase() : "applied",
      source: updated.client_preference === 'partner_routing' ? "Partner" : "Direct",
      loan_amount: updated.loan_amount,
      tenure: updated.tenure,
      loan_purpose: updated.loan_purpose,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
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
    const clients = await User.findAll({
      where: { role_id: 1 },
      order: [['createdAt', 'DESC']],
      raw: true
    });
    
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const borrower = await Borrower.findOne({ where: { user_id: client.id } });
        let applications = [];
        if (borrower) {
          applications = await Loan_Application.findAll({
            where: { borrower_id: borrower.id },
            include: [{ model: Status, attributes: ['name'] }]
          });
        }
        
        let clientStatus = 'active';
        const loanCount = applications.length;

        if (loanCount > 0) {
          const allRejected = applications.every(app => app.Status && app.Status.name.toLowerCase() === 'rejected');
          const noActive = applications.every(app => app.Status && ['disbursed', 'completed', 'rejected'].includes(app.Status.name.toLowerCase()));
          
          if (allRejected) {
            clientStatus = 'rejected';
          } else if (noActive) {
            clientStatus = 'inactive';
          }
        }

        return {
          ...client,
          loanCount: loanCount,
          status: clientStatus
        };
      })
    );
    res.json(enrichedClients);
  } catch (err) {
    console.error("All clients error:", err);
    res.status(500).json({ message: "Failed to fetch borrowers: " + err.message });
  }
};

/* -----------------------------------------------------
   ADMIN – TIMELINE ACTIVITY FEED
----------------------------------------------------- */
export const timelineActivity = async (req, res) => {
  try {
    const applications = await Loan_Application.findAll({
      limit: 20,
      include: [
        {
          model: Borrower,
          include: [{ model: User, as: 'user', attributes: ['name'] }]
        },
        { model: LoanType, as: 'loanType', attributes: ['name'] },
        { model: Status, attributes: ['name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    const timeline = applications.map((app) => {
      return {
        id: app.id,
        borrower: app.Borrower?.user ? app.Borrower.user.name : "Unknown",
        product: app.loanType ? app.loanType.name : "Home Loan",
        status: app.Status ? app.Status.name.toLowerCase() : "pending",
        date: app.updatedAt
      };
    });
    res.json(timeline);
  } catch (err) {
    console.error("Timeline error:", err);
    res.status(500).json({ message: "Failed to fetch timeline activity: " + err.message });
  }
};

/* -----------------------------------------------------
   ADMIN – LENDER INTEREST RATES
----------------------------------------------------- */
export const getLenderRates = async (req, res) => {
  try {
    const { loanTypeShortId } = req.query;
    
    let loanTypeId = 1;
    if (loanTypeShortId) {
      const lt = await LoanType.findOne({ where: { short_id: loanTypeShortId } });
      if (lt) loanTypeId = lt.id;
    }

    const lenders = await Lender.findAll({
      order: [['name', 'ASC']],
      raw: true
    });

    const rates = await Promise.all(
      lenders.map(async (lender) => {
        const floatRate = await LenderLoanRates.findOne({
          where: { lender_id: lender.id, loan_type_id: loanTypeId, rate_type: 'floating' },
          raw: true
        });
        const fixedRate = await LenderLoanRates.findOne({
          where: { lender_id: lender.id, loan_type_id: loanTypeId, rate_type: 'fixed' },
          raw: true
        });

        return {
          lenderId: lender.id,
          name: lender.name,
          type: lender.type || "Private",
          flowLow: floatRate ? String(floatRate.min_rate) : "8.5",
          flowHigh: floatRate ? String(floatRate.max_rate) : "11.0",
          fixLow: fixedRate ? String(fixedRate.min_rate) : "9.5",
          fixHigh: fixedRate ? String(fixedRate.max_rate) : "12.0",
          offer: floatRate?.offer || fixedRate?.offer || lender.offer || "Special interest rate offer",
          visible: true
        };
      })
    );

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