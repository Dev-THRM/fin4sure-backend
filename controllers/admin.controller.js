import Client from "../models/client.model.js";
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

      // 1. Get clients from clients table
      const clientsFromTable = await Client.findAll({
        where: { broker_id: String(user.id) },
        raw: true
      });

      // 2. Get referred applications to extract client details
      const referredApps = partnerIdVal ? await Loan_Application.findAll({
        where: { partner_id: partnerIdVal },
        raw: true
      }) : [];
      console.log(`DEBUG: referredApps count for partnerIdVal=${partnerIdVal}: ${referredApps.length}`);

      const clientsFromApps = referredApps.map(app => {
        const parts = app.loan_purpose ? app.loan_purpose.split(/ \u2014 | \u2013 | - /) : [];
        let clientName = 'Client';
        let clientPhone = '';
        if (parts[1]) {
          const subParts = parts[1].split(' (');
          clientName = subParts[0] || 'Client';
          if (subParts[1]) {
            clientPhone = subParts[1].replace(')', '');
          }
        } else if (app.user_id !== user.id) {
          clientName = "Registered Client";
        } else {
          return null; 
        }

        if (clientName === user.name) return null;

        return {
          id: `app_${app.id}`,
          name: clientName,
          email: `${clientName.toLowerCase().replace(/\s+/g, '')}@gmail.com`, 
          number: clientPhone || "-",
          dob: "-",
          address: "-"
        };
      }).filter(Boolean);
      console.log(`DEBUG: broker user_id=${user.id}, clientsFromApps:`, JSON.stringify(clientsFromApps));

      const combinedClientsMap = {};
      
      clientsFromTable.forEach(c => {
        combinedClientsMap[c.number || c.name] = {
          id: c.id,
          name: c.name,
          email: c.email || "-",
          number: c.number || "-",
          dob: c.dob || "-",
          address: c.address || "-"
        };
      });

      clientsFromApps.forEach(c => {
        if (!combinedClientsMap[c.number || c.name]) {
          combinedClientsMap[c.number || c.name] = c;
        }
      });

      const linkedClients = Object.values(combinedClientsMap);

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
    const totalClients = await Client.count();
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
      WHERE s.name IN ('docs','credit','submitted','sanction','legal')
    `, { type: sequelize.QueryTypes.SELECT });
    const inProgressCount = parseInt(inProgressStatuses[0]?.count || 0);

    const completedStatuses = await sequelize.query(`
      SELECT COUNT(la.id) as count
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE s.name = 'disbursed'
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
      WHERE s.name = 'disbursed'
    `, { type: sequelize.QueryTypes.SELECT });
    const disbursedAmount = parseFloat(disbursedAmountResult[0]?.disbursed_amount || 0);

    // Active borrowers = clients with active applications
    const activeBorrowers = await Client.count();

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
        const leads = await Lead.findAll({
          where: { broker_id: broker.brokerId },
          attributes: { exclude: ['pan_encrypted'] }
        });

        return {
          ...broker,
          leadCount: leads.length,
          leads
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

    const filter = {};
    if (status && status !== "all_statuses") {
      const statusObj = await Status.findOne({ where: { name: status } });
      if (statusObj) filter.status_id = statusObj.id;
    }

    const applications = await Loan_Application.findAll({
      where: filter,
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'mob_no'] },
        { model: LoanType, as: 'loanType', attributes: ['name', 'short_id'] },
        { model: Status, attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const enrichedLeads = applications.map((app) => {
      return {
        id: app.id,
        application_no: app.application_no,
        name: app.User ? app.User.name : "Unknown",
        email: app.User ? app.User.email : "-",
        number: app.User ? app.User.mob_no : "-",
        product: app.loanType ? app.loanType.name : "Home Loan",
        status: app.Status ? app.Status.name.toLowerCase() : "pending",
        source: app.client_preference === 'partner_routing' ? "Partner" : "Direct",
        client_preference: app.client_preference,
        partner_id: app.partner_id,
        loan_amount: app.loan_amount,
        tenure: app.tenure,
        loan_purpose: app.loan_purpose,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt
      };
    });

    res.json(enrichedLeads);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE BROKER STATUS
----------------------------------------------------- */
export const updateBrokerStatus = async (req, res) => {
  try {
    const { brokerId, status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const userStatus = status === "approved" ? "active" : "suspended";

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
      status: user.status === "active" ? "approved" : "rejected"
    });
  } catch (e) {
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
        { model: User, attributes: ['id', 'name', 'email', 'mob_no'] },
        { model: LoanType, as: 'loanType', attributes: ['name', 'short_id'] },
        { model: Status, attributes: ['name'] }
      ]
    });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      id: app.id,
      name: app.User ? app.User.name : "Unknown",
      email: app.User ? app.User.email : "-",
      number: app.User ? app.User.mob_no : "-",
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
        { model: User, attributes: ['id', 'name', 'email', 'mob_no'] },
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
        { model: User, attributes: ['name', 'email', 'mob_no'] },
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
      name: item.User ? item.User.name : "Unknown",
      email: item.User ? item.User.email : "-",
      number: item.User ? item.User.mob_no : "-",
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
          if (item.status === "disbursed") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
          }
          if (item.status === "credit") {
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
        { model: User, attributes: ['name', 'email', 'mob_no'] },
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
        client: item.User ? item.User.name : "Unknown",
        email_c: item.User ? item.User.email : "-",
        number_c: item.User ? item.User.mob_no : "-",
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
    const clients = await Client.findAll({
      order: [['createdAt', 'DESC']],
      raw: true
    });
    
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const count = await Loan_Application.count({
          where: { user_id: client.id }
        });
        
        return {
          ...client,
          loanCount: count
        };
      })
    );
    res.json(enrichedClients);
  } catch (err) {
    console.error("All clients error:", err);
    res.status(500).json({ message: "Failed to fetch borrowers" });
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
        { model: User, attributes: ['name'] },
        { model: LoanType, as: 'loanType', attributes: ['name'] },
        { model: Status, attributes: ['name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    const timeline = applications.map((app) => {
      return {
        id: app.id,
        borrower: app.User ? app.User.name : "Unknown",
        product: app.loanType ? app.loanType.name : "Home Loan",
        status: app.Status ? app.Status.name.toLowerCase() : "pending",
        date: app.updatedAt
      };
    });
    res.json(timeline);
  } catch (err) {
    console.error("Timeline error:", err);
    res.status(500).json({ message: "Failed to fetch timeline activity" });
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