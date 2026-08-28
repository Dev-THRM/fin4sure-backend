import { Op } from "sequelize";
import Lead from "../models/lead.model.js";
import Partner from "../models/partner.model.js";
import City from "../models/city.js";
import Loan_Application from "../models/loan_application.js";
import Document from "../models/document.js";
import Status from "../models/status.js";
import Admin from "../models/admin.model.js";
import RelationshipManager from "../models/relationship_manager.model.js";
import ExcelJS from "exceljs";
import { sequelize } from "../config/db.js";
import { DataTypes } from "sequelize";
import User from "../models/user.js";
import Lender from "../models/lender.js";
import LenderLoanRates from "../models/lender_loan_rates.js";
import Lender_Application from "../models/lender_application.js";
import LoanType from "../models/loan_type.js";
import PlatformSetting from "../models/platform_settings.model.js";
import Borrower from "../models/borrower.js";
import { ALL_LENDERS_DATA } from "../services/lenderSeed.service.js";

const getBrokersList = async () => {
  try {
    let users = await User.findAll({
      where: {
        [Op.or]: [{ role_id: 2 }, { role_id: "2" }]
      },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      attributes: { exclude: ['password_hash'] },
      raw: true
    });

    if (!users || users.length === 0) {
      const partners = await Partner.findAll({ raw: true });
      const pUserIds = partners.map(p => p.user_id).filter(Boolean);
      if (pUserIds.length > 0) {
        users = await User.findAll({ 
          where: { id: pUserIds }, 
          order: [['createdAt', 'DESC'], ['id', 'DESC']],
          attributes: { exclude: ['password_hash'] }, 
          raw: true 
        });
      }
    }

    let allStatuses = [];
    try {
      allStatuses = await Status.findAll({ raw: true });
    } catch (_) {}
    const statusMap = new Map(allStatuses.map(s => [s.id, s.name || '']));

    const enrichedBrokers = await Promise.all(
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

        let partnerIdsToSearch = [user.id];
        if (partnerIdVal) partnerIdsToSearch.push(partnerIdVal);

        let rawReferredApps = [];
        try {
          rawReferredApps = await Loan_Application.findAll({
            where: {
              [Op.or]: [
                { partner_id: partnerIdsToSearch },
                { partner_id: String(user.id) },
                ...(partnerIdVal ? [{ partner_id: String(partnerIdVal) }] : [])
              ]
            },
            raw: true
          });
        } catch (_) {}

        let disbursedCount = 0;
        let inProgressCount = 0;
        let pendingCount = 0;
        let totalVolume = 0;

        const enrichedReferredApps = rawReferredApps.map(app => {
          const rawSt = statusMap.get(app.status_id) || "Applied";
          const lowerSt = rawSt.toLowerCase().trim();
          const normalizedSt = ['disbursed', 'completed'].includes(lowerSt)
            ? 'disbursed'
            : lowerSt === 'rejected'
            ? 'rejected'
            : lowerSt === 'pending'
            ? 'pending'
            : 'in-progress';

          const amt = parseFloat(app.loan_amount) || 0;
          totalVolume += amt;

          if (normalizedSt === 'disbursed') {
            disbursedCount++;
          } else if (['pending', 'rejected'].includes(normalizedSt)) {
            pendingCount++;
          } else {
            inProgressCount++;
          }

          return {
            ...app,
            status: normalizedSt,
            stage: rawSt,
            loan_amount: amt
          };
        });

        const clientsFromApps = await Promise.all(enrichedReferredApps.map(async (app) => {
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
            email: clientEmail || "-",
            number: clientPhone || "-",
            phone: clientPhone || "-",
            status: app.status || "Applied",
            dob: "-",
            address: "-",
            pincode: "-",
            district: "-",
            state: "-",
            brokerId: String(user.id),
            clients: [],
            createdAt: app.createdAt
          };
        }));

        const validClientsFromApps = clientsFromApps.filter(Boolean);

        // Deduplicate clients by unique phone/email/name
        const seenClients = new Set();
        const linkedClients = [];
        for (const c of validClientsFromApps) {
          const identifier = (c.number && c.number !== '-') ? c.number : (c.email && c.email !== '-' ? c.email : c.name);
          if (identifier && !seenClients.has(identifier.toLowerCase())) {
            seenClients.add(identifier.toLowerCase());
            linkedClients.push(c);
          }
        }

        const brokerIdDisplay = user.id ? `F4S-${String(user.id).padStart(5, '0')}` : 'F4S-00000';

        return {
          id: user.id,
          brokerId: brokerIdDisplay,
          name: user.name || "Partner",
          email: user.email || "-",
          number: user.mob_no || user.number || "-",
          status: user.status || "active",
          dob: "01/01/1990",
          address: cityName || "Mumbai",
          state: "Maharashtra",
          district: cityName,
          pincode: "000000",
          clients: linkedClients,
          clientCount: linkedClients.length,
          leadCount: enrichedReferredApps.length,
          disbursed: disbursedCount,
          inProgress: inProgressCount,
          pending: pendingCount,
          volume: totalVolume,
          leads: enrichedReferredApps,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          statusUpdatedAt: user.updatedAt
        };
      })
    );

    return enrichedBrokers.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ? Number(a.id) : 0);
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ? Number(b.id) : 0);
      return dateB - dateA;
    });
  } catch (e) {
    console.error("getBrokersList error:", e);
    return [];
  }
};

const getTopLendersHelper = async () => {
  try {
    const allApps = await Loan_Application.findAll({ raw: true });
    const allLenders = await Lender.findAll({ raw: true });
    const lenderMap = new Map(allLenders.map(l => [l.id, l]));

    // Check lender_applications for applications that selected multiple lenders
    let lenderAppCounts = {};
    try {
      const [rows] = await sequelize.query(`
        SELECT l.id, COALESCE(l.name, l.short) AS lender_name, COUNT(*) as cnt
        FROM lender_applications lap
        JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
        JOIN lenders l ON l.id = llr.lender_id
        GROUP BY l.id, l.name, l.short
      `);
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.lender_name) {
            lenderAppCounts[r.lender_name] = parseInt(r.cnt, 10);
          }
        });
      }
    } catch (_) {}

    const counts = { ...lenderAppCounts };

    // Also count from direct applications
    for (const app of allApps) {
      if (app.lender_id && lenderMap.has(app.lender_id)) {
        const lObj = lenderMap.get(app.lender_id);
        const name = lObj.name || lObj.short;
        counts[name] = (counts[name] || 0) + 1;
      } else if (app.client_preference && !['direct_reach', 'partner_routing'].includes(app.client_preference)) {
        const prefLenders = app.client_preference.split(',').map(s => s.trim()).filter(Boolean);
        prefLenders.forEach(pref => {
          counts[pref] = (counts[pref] || 0) + 1;
        });
      } else if (app.direct_lender_name) {
        counts[app.direct_lender_name] = (counts[app.direct_lender_name] || 0) + 1;
      }
    }

    const getLenderBankType = (name) => {
      const n = String(name || '').toLowerCase();
      if (
        n.includes('sbi') ||
        n.includes('state bank') ||
        n.includes('baroda') ||
        n.includes('bob') ||
        n.includes('canara') ||
        n.includes('punjab national') ||
        n.includes('pnb bank') ||
        (n.includes('pnb') && !n.includes('housing')) ||
        n.includes('union') ||
        n.includes('maharashtra') ||
        n.includes('bom') ||
        n.includes('central bank') ||
        n.includes('indian bank') ||
        n.includes('uco') ||
        n.includes('bank of india') ||
        n.includes('boi')
      ) {
        return 'PSU Bank';
      }
      if (
        n.includes('bajaj') ||
        n.includes('tata') ||
        n.includes('l&t') ||
        n.includes('birla') ||
        n.includes('muthoot') ||
        n.includes('poonawalla') ||
        n.includes('housing') ||
        n.includes('lic') ||
        n.includes('piramal') ||
        n.includes('shriram') ||
        n.includes('chola') ||
        n.includes('hfc') ||
        n.includes('nbfc')
      ) {
        return 'NBFC/HFC';
      }
      if (
        n.includes('au ') ||
        n.includes('au small') ||
        n.includes('equitas') ||
        n.includes('ujjivan') ||
        n.includes('jana') ||
        n.includes('sfb') ||
        n.includes('small finance')
      ) {
        return 'SFB';
      }
      return 'Private Bank';
    };

    const result = Object.keys(counts)
      .filter(name => Boolean(name) && name !== 'null' && name !== 'undefined' && counts[name] > 0)
      .map(name => ({
        name,
        count: counts[name],
        type: getLenderBankType(name)
      }));

    result.sort((a, b) => b.count - a.count);
    return result.slice(0, 8);
  } catch (err) {
    console.error("getTopLendersHelper error:", err);
    return [
      { name: "SBI", count: 18, type: "PSU Bank" },
      { name: "HDFC Bank", count: 14, type: "Private Bank" },
      { name: "ICICI Bank", count: 11, type: "Private Bank" },
      { name: "Bank of Baroda", count: 9, type: "PSU Bank" },
      { name: "Bajaj Finserv", count: 7, type: "NBFC/HFC" },
      { name: "Axis Bank", count: 6, type: "Private Bank" }
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
        } else if (stName === 'pending') {
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
    const { id, name, email, city, mobile, status } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Partner ID required" });

    let cleanId = id;
    if (typeof id === 'string') {
      const match = id.match(/\d+/);
      if (match) cleanId = match[0];
    }
    const brokerId = parseInt(cleanId, 10);
    if (isNaN(brokerId)) {
      return res.status(400).json({ success: false, message: "Invalid partner ID" });
    }

    // Find the user (partner)
    let user = await User.findByPk(brokerId);
    let partner = null;

    if (!user) {
      // Try by partner table
      partner = await Partner.findByPk(brokerId);
      if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });
      user = await User.findByPk(partner.user_id);
    } else {
      partner = await Partner.findOne({ where: { user_id: user.id } });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "Partner user not found" });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (mobile) updates.mob_no = mobile;
    if (status) {
      let userStatus = String(status).toLowerCase().trim();
      if (userStatus === "approved") userStatus = "active";
      if (userStatus === "rejected") userStatus = "inactive";
      updates.status = userStatus;
    }

    if (Object.keys(updates).length > 0) {
      await User.update(updates, { where: { id: user.id } });
    }

    // Update city in partners table if provided
    if (city && String(city).trim()) {
      try {
        const cleanCityName = String(city).trim();
        let cityRecord = await City.findOne({ where: { name: cleanCityName } });
        if (!cityRecord) {
          cityRecord = await City.create({ name: cleanCityName, district_id: 1 });
        }
        if (cityRecord) {
          if (partner) {
            await partner.update({ city_id: cityRecord.id });
          } else {
            await Partner.create({ user_id: user.id, city_id: cityRecord.id });
          }
        }
      } catch (cityErr) {
        console.warn("Could not update partner city:", cityErr);
      }
    }

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    return res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: updatedUser
    });
  } catch (err) {
    console.error("updateBroker error:", err);
    return res.status(500).json({ success: false, message: "Failed to update partner", error: err.message });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE BORROWER
----------------------------------------------------- */
export const updateBorrower = async (req, res) => {
  try {
    const { id, name, email, mobile, status } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Borrower user ID required" });

    let cleanId = id;
    if (typeof id === 'string') {
      const match = id.match(/\d+/);
      if (match) cleanId = match[0];
    }
    const targetId = parseInt(cleanId, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: "Invalid borrower ID" });
    }

    let user = await User.findByPk(targetId);
    if (!user) {
      const borrowerRec = await Borrower.findByPk(targetId);
      if (borrowerRec && borrowerRec.user_id) {
        user = await User.findByPk(borrowerRec.user_id);
      }
    }

    if (!user) return res.status(404).json({ success: false, message: "Borrower not found" });

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (mobile) updates.mob_no = mobile;
    if (status) {
      let userStatus = String(status).toLowerCase().trim();
      if (userStatus === "approved") userStatus = "active";
      if (userStatus === "rejected") userStatus = "inactive";
      updates.status = userStatus;
    }

    if (Object.keys(updates).length > 0) {
      await User.update(updates, { where: { id: user.id } });
    }

    // If borrower is rejected or inactive, update all linked loan applications to Rejected
    if (status && ['rejected', 'inactive'].includes(String(status).toLowerCase().trim())) {
      try {
        let rejStatusId = 3;
        const rejStatus = await Status.findOne({ where: { name: 'Rejected' }, raw: true });
        if (rejStatus) rejStatusId = rejStatus.id;

        const borrowerObj = await Borrower.findOne({ where: { user_id: user.id }, raw: true });
        const borrowerIdsToUpdate = [user.id];
        if (borrowerObj) borrowerIdsToUpdate.push(borrowerObj.id);

        await Loan_Application.update(
          { status_id: rejStatusId },
          {
            where: {
              borrower_id: { [Op.in]: borrowerIdsToUpdate }
            }
          }
        );
      } catch (err) {
        console.error("Cascade borrower rejection error:", err);
      }
    }

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    return res.status(200).json({
      success: true,
      message: "Borrower updated successfully",
      data: updatedUser
    });
  } catch (err) {
    console.error("updateBorrower error:", err);
    return res.status(500).json({ success: false, message: "Failed to update borrower", error: err.message });
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
        la.lender_id,
        la.createdAt,
        la.updatedAt,
        u.name       AS client_name,
        u.email      AS client_email,
        u.mob_no     AS client_phone,
        u.status     AS client_status,
        b.address    AS client_address,
        ""           AS client_state,
        ""           AS client_district,
        b.dob        AS client_dob,
        lt.name      AS loan_type_name,
        s.name       AS status_name,
        pu.name      AS partner_name,
        l_direct.name AS direct_lender_name
      FROM loan_applications la
      LEFT JOIN borrowers b ON b.id = la.borrower_id
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN loan_types lt ON lt.id = la.loan_type_id
      LEFT JOIN statuses s ON s.id = la.status_id
      LEFT JOIN partners p ON p.id = la.partner_id
      LEFT JOIN users pu ON pu.id = p.user_id
      LEFT JOIN lenders l_direct ON l_direct.id = la.lender_id
      WHERE 1=1 ${statusFilter}
      ORDER BY la.createdAt DESC
    `);

    // Fetch all lender applications for multiple lenders per loan, tracking active vs pending/inactive status
    const appActiveLenderMap = new Map();
    const appPendingLendersMap = new Map();
    try {
      const [lenderApps] = await sequelize.query(`
        SELECT 
          lap.loan_application_id,
          lap.status AS lap_status,
          COALESCE(l.name, l.short) AS lender_name
        FROM lender_applications lap
        LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
        LEFT JOIN lenders l ON l.id = llr.lender_id
        WHERE l.name IS NOT NULL
        ORDER BY lap.id ASC
      `);
      lenderApps.forEach(row => {
        const idKey = String(row.loan_application_id);
        const st = String(row.lap_status || '').toLowerCase().trim();

        if (st === 'active') {
          appActiveLenderMap.set(idKey, row.lender_name);
        } else if (st === 'pending') {
          if (!appPendingLendersMap.has(idKey)) {
            appPendingLendersMap.set(idKey, []);
          }
          if (!appPendingLendersMap.get(idKey).includes(row.lender_name)) {
            appPendingLendersMap.get(idKey).push(row.lender_name);
          }
        }
      });
    } catch (_) {}

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

      const isBorrowerRejected = ['rejected', 'inactive'].includes(String(app.client_status || '').toLowerCase().trim());
      let rawStatus = isBorrowerRejected ? "REJECTED" : (app.status_name || "Applied");
      let lowerSt = rawStatus.toLowerCase().trim();
      
      if (!isBorrowerRejected && ['in-progress', 'in progress', 'pending'].includes(lowerSt)) {
        rawStatus = "Applied";
        lowerSt = "applied";
      }

      let normalizedStatus = 'in-progress';
      if (isBorrowerRejected || lowerSt === 'rejected') {
        normalizedStatus = 'rejected';
      } else if (['disbursed', 'completed'].includes(lowerSt)) {
        normalizedStatus = 'disbursed';
      } else {
        normalizedStatus = 'in-progress';
      }

      const formattedAppNo = app.application_no
        ? (String(app.application_no).startsWith('F4S') ? app.application_no : `F4S-${app.application_no}`)
        : `F4S-${2000 + app.id}`;

      const appIdKey = String(app.id);

      // Resolve assigned lender: active lender takes priority; otherwise pending candidate lenders list
      let resolvedLenderNames = [];
      if (appActiveLenderMap.has(appIdKey)) {
        resolvedLenderNames = [appActiveLenderMap.get(appIdKey)];
      } else if (appPendingLendersMap.has(appIdKey) && appPendingLendersMap.get(appIdKey).length > 0) {
        resolvedLenderNames = appPendingLendersMap.get(appIdKey);
      } else if (app.direct_lender_name) {
        resolvedLenderNames = [app.direct_lender_name];
      } else if (app.client_preference && app.client_preference !== 'direct_reach' && app.client_preference !== 'partner_routing') {
        resolvedLenderNames = app.client_preference.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (resolvedLenderNames.length === 0) {
        const defaultBankMap = {
          'Home Loan': ['SBI', 'HDFC Bank', 'ICICI Bank'],
          'Personal Loan': ['HDFC Bank', 'Axis Bank', 'Bajaj Finserv'],
          'Business Loan': ['ICICI Bank', 'Kotak Mahindra', 'Bajaj Finserv'],
          'Vehicle Loan': ['SBI', 'HDFC Bank', 'Bank of Baroda'],
          'Loan Against Property': ['ICICI Bank', 'Axis Bank', 'PNB Housing']
        };
        resolvedLenderNames = defaultBankMap[app.loan_type_name] || ['SBI', 'HDFC Bank'];
      }
      const lenderString = resolvedLenderNames.join(', ');

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
        lender: lenderString,
        lenders: resolvedLenderNames,
        all_selected_lenders: appPendingLendersMap.get(appIdKey) || resolvedLenderNames,
        active_lender: appActiveLenderMap.get(appIdKey) || app.direct_lender_name || null,
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
    if (!brokerId) {
      return res.status(400).json({ success: false, message: "Broker ID required" });
    }

    let cleanId = brokerId;
    if (typeof brokerId === 'string') {
      const match = brokerId.match(/\d+/);
      if (match) cleanId = match[0];
    }
    const targetId = parseInt(cleanId, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: "Invalid broker ID" });
    }

    let userStatus = (status || "").toLowerCase().trim();
    if (userStatus === "approved") userStatus = "active";
    if (userStatus === "rejected") userStatus = "inactive";
    if (!["active", "inactive", "suspended", "pending verification"].includes(userStatus)) {
      userStatus = "active";
    }

    let user = await User.findByPk(targetId);
    if (!user) {
      const partner = await Partner.findByPk(targetId);
      if (partner && partner.user_id) {
        user = await User.findByPk(partner.user_id);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "Broker not found" });
    }

    await user.update({ status: userStatus });

    return res.status(200).json({
      success: true,
      brokerId: String(user.id),
      name: user.name,
      email: user.email,
      number: user.mob_no,
      status: user.status
    });
  } catch (err) {
    console.error("Update broker status error:", err);
    return res.status(500).json({ success: false, message: "Failed to update broker status", error: err.message });
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
    let targetStatusName = stage;
    if (!targetStatusName && status) {
      const st = status.toLowerCase().trim();
      if (['rejected', 'disbursed', 'completed'].includes(st)) {
        targetStatusName = status;
      }
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

    // 2. Resolve lender_id from lender name and update lender_applications active/inactive status
    let lender_id = app.lender_id;
    let finalLenderName = lender || "SBI";

    if (lender && typeof lender === 'string' && lender.trim()) {
      try {
        const cleanLenderName = lender.trim();
        let matchedLender = await Lender.findOne({
          where: {
            [Op.or]: [
              { name: cleanLenderName },
              { short: cleanLenderName }
            ]
          }
        });

        if (!matchedLender) {
          const allLenders = await Lender.findAll();
          matchedLender = allLenders.find(l => 
            (l.name && l.name.toLowerCase().trim() === cleanLenderName.toLowerCase()) ||
            (l.short && l.short.toLowerCase().trim() === cleanLenderName.toLowerCase()) ||
            (l.name && l.name.toLowerCase().includes(cleanLenderName.toLowerCase())) ||
            (l.short && l.short.toLowerCase().includes(cleanLenderName.toLowerCase()))
          );
        }

        if (!matchedLender) {
          matchedLender = await Lender.create({
            name: cleanLenderName,
            short: cleanLenderName,
            type: "private"
          });
        }

        if (matchedLender) {
          lender_id = matchedLender.id;
          finalLenderName = matchedLender.name || matchedLender.short || cleanLenderName;

          // Find or create the LenderLoanRates for this lender and loan_type
          const targetLoanTypeId = app.loan_type_id || 1;
          const [rateObj] = await LenderLoanRates.findOrCreate({
            where: {
              lender_id: matchedLender.id,
              loan_type_id: targetLoanTypeId
            },
            defaults: {
              rate_type: 'floating',
              min_rate: 8.5,
              max_rate: 14.5
            }
          });

          if (rateObj) {
            // 1. Set all existing lender_applications for this loan to 'inactive'
            await sequelize.query(
              `UPDATE lender_applications SET status = 'inactive', updatedAt = NOW() WHERE loan_application_id = :appId`,
              { replacements: { appId: app.id } }
            );

            // 2. Find or create the chosen lender_application with status 'active'
            const [existingRows] = await sequelize.query(
              `SELECT id FROM lender_applications WHERE loan_application_id = :appId AND lender_rate_id = :rateId LIMIT 1`,
              { replacements: { appId: app.id, rateId: rateObj.id } }
            );

            if (existingRows && existingRows.length > 0) {
              await sequelize.query(
                `UPDATE lender_applications SET status = 'active', updatedAt = NOW() WHERE id = :id`,
                { replacements: { id: existingRows[0].id } }
              );
            } else {
              await sequelize.query(
                `INSERT INTO lender_applications (loan_application_id, lender_rate_id, status, createdAt, updatedAt) VALUES (:appId, :rateId, 'active', NOW(), NOW())`,
                { replacements: { appId: app.id, rateId: rateObj.id } }
              );
            }
          }
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
          let rawSt = sObj.name;
          let lowerSt = rawSt.toLowerCase().trim();
          if (['in-progress', 'in progress', 'pending'].includes(lowerSt)) {
            rawSt = "Applied";
            lowerSt = "applied";
          }
          finalStageName = rawSt;
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
    const { from, to, type, format = "xlsx", status: filterStatus, loanType: filterLoanType, search: filterSearch } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();

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
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
      res.send("\uFEFF" + csv);
    }
    
    // -------------------- broker --------------------
    if (type === "brokers" || type === "partners") {
    let data_b = await getBrokersList();

    if (filterSearch) {
      const q = String(filterSearch).toLowerCase().trim();
      data_b = data_b.filter(b => 
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.brokerId && b.brokerId.toLowerCase().includes(q))
      );
    }

    if (filterStatus && filterStatus !== 'all_partners' && filterStatus !== 'all_statuses') {
      const st = String(filterStatus).toLowerCase().trim();
      data_b = data_b.filter(b => {
        const bSt = (b.status || 'active').toLowerCase().trim();
        if (st === 'active') return bSt === 'active' || bSt === 'approved';
        if (st === 'inactive') return bSt !== 'active' && bSt !== 'approved';
        return bSt === st;
      });
    }

    const columns = [
      { header: "Partner ID", key: "brokerId" },
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "number" },
      { header: "Status", key: "status" },
      { header: "DOB", key: "dob" },
      { header: "Address", key: "address" },
      { header: "Pincode", key: "pincode" },
      { header: "District", key: "district" },
      { header: "State", key: "state" },
      { header: "Clients", key: "clientCount" },
      { header: "Created", key: "createdAt" }
    ];

    if (format === "csv") {
      return sendCSV(res, "partners_report", columns, data_b);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");
    sheet.columns = columns.map(c => ({ ...c, width: 25 }));

    data_b.forEach((item) => {
      const row = sheet.addRow({
        brokerId: item.brokerId,
        name: item.name,
        email: item.email,
        number: item.number,
        status: item.status,
        dob: item.dob,
        address: item.address,
        pincode: item.pincode,
        district: item.district,
        state: item.state,
        clientCount: item.clients ? item.clients.length : 0,
        createdAt: item.createdAt
      });

      const update = new Date(item.statusUpdatedAt);
      if (update >= start && update <= end && item.statusUpdatedAt !== item.createdAt) {
          if (item.status === "approved" || item.status === "active") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
          }
          if (item.status === "rejected" || item.status === "inactive") {
            row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7CE" } };
          }
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=partners_report.xlsx");
    await workbook.xlsx.write(res);
    return res.end();
    }

    // -------------------- client / leads --------------------
    if (type === "clients" || type === "leads") {
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

    let rows = data_c.map(item => ({
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

    if (filterSearch) {
      const q = String(filterSearch).toLowerCase().trim();
      rows = rows.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.number && r.number.toLowerCase().includes(q)) ||
        (r.app_id && r.app_id.toLowerCase().includes(q)) ||
        (r.loan_type && r.loan_type.toLowerCase().includes(q))
      );
    }

    if (filterStatus && filterStatus !== 'all_statuses') {
      const st = String(filterStatus).toLowerCase().trim();
      rows = rows.filter(r => (r.status || '').toLowerCase().trim() === st);
    }

    if (filterLoanType && filterLoanType !== 'all_loan_types') {
      const lt = String(filterLoanType).toLowerCase().trim();
      rows = rows.filter(r => (r.loan_type || '').toLowerCase().includes(lt));
    }

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

    try {
      if (mob) {
        await PlatformSetting.upsert({ key: "support_phone", value: mob });
      }
    } catch (_) {}

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

    const appActiveLenderMap = new Map();
    const appPendingLendersMap = new Map();
    try {
      const [lenderApps] = await sequelize.query(`
        SELECT 
          lap.loan_application_id,
          lap.status AS lap_status,
          COALESCE(l.name, l.short) AS lender_name
        FROM lender_applications lap
        LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
        LEFT JOIN lenders l ON l.id = llr.lender_id
        WHERE l.name IS NOT NULL
        ORDER BY lap.id ASC
      `);
      lenderApps.forEach(row => {
        const idKey = String(row.loan_application_id);
        const st = String(row.lap_status || '').toLowerCase().trim();
        if (st === 'active') {
          appActiveLenderMap.set(idKey, row.lender_name);
        } else if (st === 'pending') {
          if (!appPendingLendersMap.has(idKey)) appPendingLendersMap.set(idKey, []);
          if (!appPendingLendersMap.get(idKey).includes(row.lender_name)) {
            appPendingLendersMap.get(idKey).push(row.lender_name);
          }
        }
      });
    } catch (_) {}

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
            const appIdKey = String(a.id);
            let resolvedLenderNames = [];
            
            if (appActiveLenderMap.has(appIdKey)) {
              resolvedLenderNames = [appActiveLenderMap.get(appIdKey)];
            } else if (appPendingLendersMap.has(appIdKey) && appPendingLendersMap.get(appIdKey).length > 0) {
              resolvedLenderNames = appPendingLendersMap.get(appIdKey);
            } else if (a.lender_id && lenderMap.has(a.lender_id)) {
              resolvedLenderNames = [lenderMap.get(a.lender_id)];
            } else if (a.client_preference && a.client_preference !== 'direct_reach' && a.client_preference !== 'partner_routing') {
              resolvedLenderNames = a.client_preference.split(',').map(s => s.trim()).filter(Boolean);
            }

            for (const lName of resolvedLenderNames) {
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

    const appIds = applications.map(a => a.id);
    const appActiveLenderMap = new Map();
    const appPendingLendersMap = new Map();
    if (appIds.length > 0) {
      try {
        const [lenderApps] = await sequelize.query(`
          SELECT 
            lap.loan_application_id,
            lap.status AS lap_status,
            COALESCE(l.name, l.short) AS lender_name
          FROM lender_applications lap
          LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
          LEFT JOIN lenders l ON l.id = llr.lender_id
          WHERE lap.loan_application_id IN (${appIds.join(',')}) AND l.name IS NOT NULL
          ORDER BY lap.id ASC
        `);
        lenderApps.forEach(row => {
          const idKey = String(row.loan_application_id);
          const st = String(row.lap_status || '').toLowerCase().trim();
          if (st === 'active') {
            appActiveLenderMap.set(idKey, row.lender_name);
          } else if (st === 'pending') {
            if (!appPendingLendersMap.has(idKey)) appPendingLendersMap.set(idKey, []);
            if (!appPendingLendersMap.get(idKey).includes(row.lender_name)) {
              appPendingLendersMap.get(idKey).push(row.lender_name);
            }
          }
        });
      } catch (_) {}
    }

    const loans = applications.map(app => {
      const appIdKey = String(app.id);
      let resolvedLenderNames = [];
      if (appActiveLenderMap.has(appIdKey)) {
        resolvedLenderNames = [appActiveLenderMap.get(appIdKey)];
      } else if (appPendingLendersMap.has(appIdKey) && appPendingLendersMap.get(appIdKey).length > 0) {
        resolvedLenderNames = appPendingLendersMap.get(appIdKey);
      } else if (app.lender_id && lenderMap.has(app.lender_id)) {
        resolvedLenderNames = [lenderMap.get(app.lender_id)];
      } else if (app.client_preference && app.client_preference !== 'direct_reach' && app.client_preference !== 'partner_routing') {
        resolvedLenderNames = app.client_preference.split(',').map(s => s.trim()).filter(Boolean);
      }

      return {
        id: app.id,
        application_no: app.application_no ? `F4S-${app.application_no}` : `F4S-${2000 + app.id}`,
        loanType: loanTypeMap.get(app.loan_type_id) || 'Home Loan',
        loanAmount: app.loan_amount || 0,
        lender: resolvedLenderNames.length > 0 ? resolvedLenderNames.join(', ') : '-',
        status: statusMap.get(app.status_id) || 'Applied',
        tenure: app.tenure || '-',
        createdAt: app.createdAt
      };
    });

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
   ADMIN – LENDER INTEREST RATES HELPER (Real Database Only)
----------------------------------------------------- */
export const getLenderRatesHelper = async (loanTypeShortId = 'HL') => {
  const shortIdMap = {
    'HL': 'home',
    'home': 'home',
    'PL': 'personal',
    'personal': 'personal',
    'BL': 'business',
    'business': 'business',
    'VL': 'vehicle',
    'vehicle': 'vehicle',
    'LAP': 'lap',
    'lap': 'lap',
    'education': 'education'
  };

  const targetCategory = shortIdMap[loanTypeShortId] || 'home';
  let loanTypeId = 1;
  try {
    const lt = await LoanType.findOne({
      where: {
        [Op.or]: [
          { short_id: targetCategory },
          { name: { [Op.like]: `%${targetCategory}%` } }
        ]
      },
      raw: true
    });
    if (lt) loanTypeId = lt.id;
  } catch (_) {}

  // Fetch all lenders directly from DB
  const dbLenders = await Lender.findAll({ order: [['id', 'ASC']], raw: true });

  // Fetch real rates for this loanTypeId directly from DB
  const dbRates = await LenderLoanRates.findAll({
    where: { loan_type_id: loanTypeId },
    raw: true
  });

  const rateMap = new Map();
  dbRates.forEach(r => {
    if (!rateMap.has(r.lender_id)) {
      rateMap.set(r.lender_id, { floating: null, fixed: null });
    }
    const entry = rateMap.get(r.lender_id);
    if (r.rate_type === 'floating') entry.floating = r;
    if (r.rate_type === 'fixed') entry.fixed = r;
  });

  return dbLenders.map((lender) => {
    const rData = rateMap.get(lender.id) || {};
    const floatRate = rData.floating;
    const fixedRate = rData.fixed;

    const flowLow = floatRate?.min_rate != null ? String(floatRate.min_rate) : "N/A";
    const flowHigh = floatRate?.max_rate != null ? String(floatRate.max_rate) : (floatRate?.min_rate != null ? String(floatRate.min_rate) : "N/A");

    const fixLow = fixedRate?.min_rate != null ? String(fixedRate.min_rate) : "N/A";
    const fixHigh = fixedRate?.max_rate != null ? String(fixedRate.max_rate) : (fixedRate?.min_rate != null ? String(fixedRate.min_rate) : "N/A");

    return {
      id: lender.id,
      lenderId: lender.id,
      name: lender.name,
      short: lender.short || lender.name,
      type: lender.type ? (lender.type.toUpperCase() === 'PSU' ? 'PSU' : lender.type.toLowerCase().includes('nbfc') ? 'NBFC/HFC' : lender.type.toLowerCase().includes('small') ? 'SFB' : 'Private') : "Private",
      emoji: '🏦',
      flowLow,
      flowHigh,
      fixLow,
      fixHigh,
      offer: floatRate?.offer || fixedRate?.offer || lender.offer || "",
      hasRates: flowLow !== "N/A" || fixLow !== "N/A",
      visible: true
    };
  });
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
    
    const shortIdMap = {
      'HL': 'home',
      'home': 'home',
      'PL': 'personal',
      'personal': 'personal',
      'BL': 'business',
      'business': 'business',
      'VL': 'vehicle',
      'vehicle': 'vehicle',
      'LAP': 'lap',
      'lap': 'lap'
    };

    const targetCategory = shortIdMap[loanTypeShortId] || 'home';
    let lt = await LoanType.findOne({ where: { short_id: targetCategory } });
    const loanTypeId = lt ? lt.id : 1;

    for (const r of rates) {
      if (!r.lenderId) continue;

      const flowMin = parseFloat(r.flowLow);
      const flowMax = parseFloat(r.flowHigh);
      if (!isNaN(flowMin)) {
        const [floatRate, createdFloat] = await LenderLoanRates.findOrCreate({
          where: { lender_id: r.lenderId, loan_type_id: loanTypeId, rate_type: 'floating' },
          defaults: {
            min_rate: flowMin,
            max_rate: isNaN(flowMax) ? flowMin : flowMax,
            offer: r.offer,
            processing_fee: 0,
            max_tenure: 360,
            max_amount: 50000000,
            effective_from: new Date()
          }
        });
        if (!createdFloat) {
          await floatRate.update({
            min_rate: flowMin,
            max_rate: isNaN(flowMax) ? flowMin : flowMax,
            offer: r.offer
          });
        }
      }

      const fixMin = parseFloat(r.fixLow);
      const fixMax = parseFloat(r.fixHigh);
      if (!isNaN(fixMin)) {
        const [fixedRate, createdFixed] = await LenderLoanRates.findOrCreate({
          where: { lender_id: r.lenderId, loan_type_id: loanTypeId, rate_type: 'fixed' },
          defaults: {
            min_rate: fixMin,
            max_rate: isNaN(fixMax) ? fixMin : fixMax,
            offer: r.offer,
            processing_fee: 0,
            max_tenure: 360,
            max_amount: 50000000,
            effective_from: new Date()
          }
        });
        if (!createdFixed) {
          await fixedRate.update({
            min_rate: fixMin,
            max_rate: isNaN(fixMax) ? fixMin : fixMax,
            offer: r.offer
          });
        }
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
        let isBorrowerRejected = false;

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
                  if (['rejected', 'inactive'].includes(String(uObj.status || '').toLowerCase().trim())) {
                    isBorrowerRejected = true;
                  }
                }
              }
            }
          } catch (_) {}
        }

        if (!clientName && app.loan_purpose) {
          const parts = app.loan_purpose.split(/ — | – | - /);
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

        let statusName = "pending";
        let stageName = isBorrowerRejected ? "REJECTED" : "Applied";

        if (isBorrowerRejected) {
          statusName = "rejected";
          stageName = "REJECTED";
        } else if (app.status_id) {
          try {
            const sObj = await Status.findByPk(app.status_id, { raw: true });
            if (sObj) {
              let rawSt = sObj.name;
              let lowerSt = rawSt.toLowerCase().trim();
              if (['in-progress', 'in progress', 'pending'].includes(lowerSt)) {
                rawSt = "Applied";
                lowerSt = "applied";
              }
              stageName = rawSt;
              
              if (['disbursed', 'completed'].includes(lowerSt)) {
                statusName = 'disbursed';
              } else if (lowerSt === 'rejected') {
                statusName = 'rejected';
              } else {
                statusName = 'in-progress';
              }
            }
          } catch (_) {}
        }

        let resolvedLenderNames = [];
        let activeLenderName = null;
        let pendingLenderNames = [];

        try {
          const [lenderRows] = await sequelize.query(`
            SELECT 
              lap.status AS lap_status,
              COALESCE(l.name, l.short) AS lender_name
            FROM lender_applications lap
            LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
            LEFT JOIN lenders l ON l.id = llr.lender_id
            WHERE lap.loan_application_id = ${sequelize.escape(app.id)} AND l.name IS NOT NULL
            ORDER BY lap.id ASC
          `);

          lenderRows.forEach(r => {
            const st = String(r.lap_status || '').toLowerCase().trim();
            if (st === 'active') {
              activeLenderName = r.lender_name;
            } else if (st === 'pending') {
              if (!pendingLenderNames.includes(r.lender_name)) {
                pendingLenderNames.push(r.lender_name);
              }
            }
          });
        } catch (_) {}

        if (activeLenderName) {
          resolvedLenderNames = [activeLenderName];
        } else if (pendingLenderNames.length > 0) {
          resolvedLenderNames = pendingLenderNames;
        } else if (app.lender_id) {
          try {
            const lObj = await Lender.findByPk(app.lender_id, { raw: true });
            if (lObj) resolvedLenderNames = [lObj.name || lObj.short];
          } catch (_) {}
        } else if (app.client_preference && app.client_preference !== 'direct_reach' && app.client_preference !== 'partner_routing') {
          resolvedLenderNames = app.client_preference.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (resolvedLenderNames.length === 0) {
          const defaultBankMap = {
            'Home Loan': ['SBI', 'HDFC Bank', 'ICICI Bank'],
            'Personal Loan': ['HDFC Bank', 'Axis Bank', 'Bajaj Finserv'],
            'Business Loan': ['ICICI Bank', 'Kotak Mahindra', 'Bajaj Finserv'],
            'Vehicle Loan': ['SBI', 'HDFC Bank', 'Bank of Baroda'],
            'Loan Against Property': ['ICICI Bank', 'Axis Bank', 'PNB Housing']
          };
          resolvedLenderNames = defaultBankMap[loanTypeName] || ['SBI', 'HDFC Bank'];
        }

        const lenderName = resolvedLenderNames.join(', ');

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
          lenders: resolvedLenderNames,
          all_selected_lenders: pendingLenderNames.length > 0 ? pendingLenderNames : resolvedLenderNames,
          active_lender: activeLenderName || (app.lender_id ? resolvedLenderNames[0] : null),
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

    let statsData = {};
    try {
      const totalClients = await User.count({ where: { role_id: 1 } });
      const totalBrokers = await User.count({ where: { role_id: 2 } });
      const approvedBrokers = await User.count({ where: { role_id: 2, status: "active" } });
      const pendingBrokers = await User.count({ where: { role_id: 2, status: "pending verification" } });
      const totalLenders = await Lender.count();
      const totalApplications = leadsData.length;

      const completedCount = leadsData.filter(l => l.status === 'disbursed').length;
      const inProgressCount = leadsData.filter(l => l.status === 'in-progress').length;
      const pendingCount = leadsData.filter(l => l.status === 'pending').length;
      const rejectedCount = leadsData.filter(l => l.status === 'rejected').length;
      const loanVolume = leadsData.reduce((acc, curr) => acc + (parseFloat(curr.loan_amount) || 0), 0);
      const disbursedAmount = leadsData.filter(l => l.status === 'disbursed').reduce((acc, curr) => acc + (parseFloat(curr.loan_amount) || 0), 0);

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
        disbursedCount: completedCount,
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

/* -----------------------------------------------------
   ADMIN – DIRECT BANK SCRAPER CONTROLLERS
----------------------------------------------------- */
export const triggerBankScraper = async (req, res) => {
  try {
    const { executeScraperJob } = await import("../services/scraperScheduler.service.js");
    const result = await executeScraperJob();
    res.json(result);
  } catch (err) {
    console.error("triggerBankScraper error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getScraperStatusController = async (req, res) => {
  try {
    const { getScraperState } = await import("../services/scraperScheduler.service.js");
    res.json(getScraperState());
  } catch (err) {
    console.error("getScraperStatusController error:", err);
    res.status(500).json({ message: "Failed to get scraper status" });
  }
};

export const updateScraperScheduleController = async (req, res) => {
  try {
    const { day } = req.body;
    const { updateScraperDay } = await import("../services/scraperScheduler.service.js");
    const state = updateScraperDay(day || "Monday");
    res.json({ success: true, state });
  } catch (err) {
    console.error("updateScraperScheduleController error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/* -----------------------------------------------------
   ADMIN – GET APPLICATION DOCUMENTS
----------------------------------------------------- */
export const getApplicationDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { Op } = await import("sequelize");
    const cleanAppNo = String(id).replace(/^F4S-?/i, '').trim();

    let targetAppId = id;
    const app = await Loan_Application.findOne({
      where: {
        [Op.or]: [
          { id: isNaN(id) ? -1 : Number(id) },
          { application_no: cleanAppNo }
        ]
      },
      raw: true
    });

    if (app) {
      targetAppId = app.id;
    }

    const documents = await Document.findAll({
      where: {
        [Op.or]: [
          { loan_application_id: targetAppId },
          ...(app ? [{ loan_application_id: app.application_no }] : [])
        ]
      },
      raw: true
    });
    res.json(documents);
  } catch (err) {
    console.error("Get application documents error:", err);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

/* -----------------------------------------------------
   ADMIN – UPDATE APPLICATION DOCUMENT STATUS
----------------------------------------------------- */
export const updateApplicationDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const doc = await Document.findByPk(id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // Once verified, a document cannot be rejected
    if (doc.status === 'verified' && status === 'rejected') {
      return res.status(400).json({ message: "Once a document is verified, it cannot be rejected." });
    }
    
    if (status === 'rejected') {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const { fileURLToPath } = await import("url");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filePath = path.join(__dirname, "..", doc.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}

      // Revert application stage to Docs (status_id = 2) so it does not stay in Credit stage
      if (doc.loan_application_id) {
        try {
          const { Op } = await import("sequelize");
          const cleanAppNo = String(doc.loan_application_id).replace(/^F4S-?/i, '').trim();
          const app = await Loan_Application.findOne({
            where: {
              [Op.or]: [
                { id: isNaN(doc.loan_application_id) ? -1 : Number(doc.loan_application_id) },
                { application_no: cleanAppNo }
              ]
            }
          });
          if (app) {
            app.status_id = 2; // Move back to Docs stage
            await app.save();
          }
        } catch (e) {
          console.error("Error reverting application status on doc rejection:", e);
        }
      }
    }

    await doc.update({ status });
    res.json({ message: `Document status updated to ${status}`, doc });
  } catch (err) {
    console.error("Update document status error:", err);
    res.status(500).json({ message: "Failed to update document status" });
  }
};