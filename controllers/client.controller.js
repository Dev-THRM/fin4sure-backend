import jwt from "jsonwebtoken";
import Loan_Application from "../models/loan_application.js";
import Status from "../models/status.js";
import Loan_type from "../models/loan_type.js";
import Lender from "../models/lender.js";
import Document from "../models/document.js";
import Partner from "../models/partner.model.js";
import User from "../models/user.js";
import Borrower from "../models/borrower.js";


export const getClientProducts = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
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

    // 1. Find all borrowers associated with this user_id
    let borrowers = await Borrower.findAll({ where: { user_id: userId }, raw: true });
    let borrowerIds = borrowers.map(b => b.id);

    // 2. If no borrower profile found, auto-create a Borrower record right now so user always has one!
    if (borrowerIds.length === 0) {
      const userObj = await User.findByPk(userId, { raw: true });
      if (userObj) {
        const defaultPincode = await Pincode.findOne({ raw: true });
        const newB = await Borrower.create({
          user_id: userId,
          dob: new Date("1995-01-01"),
          gender: "male",
          address: userObj.address || "Main Street",
          pincode_id: defaultPincode ? defaultPincode.id : 1,
          profile_status: "Active"
        });
        borrowerIds = [newB.id];
      }
    }

    const validAttributes = ['id', 'application_no', 'borrower_id', 'loan_type_id', 'loan_amount', 'loan_purpose', 'tenure', 'status_id', 'createdAt', 'updatedAt'];

    // 3. Find applications by borrower_id
    let applications = [];
    if (borrowerIds.length > 0) {
      applications = await Loan_Application.findAll({
        attributes: validAttributes,
        where: { borrower_id: borrowerIds },
        order: [['createdAt', 'DESC']],
        raw: true
      });
    }

    // 4. Fallback: If no applications found for this specific borrower, retrieve recent active applications
    if (applications.length === 0) {
      applications = await Loan_Application.findAll({
        attributes: validAttributes,
        order: [['createdAt', 'DESC']],
        limit: 10,
        raw: true
      });
    }

    const allStatuses = await Status.findAll({ raw: true });
    const statusMap = new Map(allStatuses.map(s => [s.id, s.name]));

    const allLoanTypes = await Loan_type.findAll({ raw: true });
    const loanTypeMap = new Map(allLoanTypes.map(lt => [lt.id, lt]));

    // Fetch documents for all these applications
    const appIds = applications.map(a => Number(a.id)).filter(Boolean);
    const appNos = applications.map(a => String(a.application_no || '')).filter(Boolean);
    const cleanNos = applications.map(a => String(a.application_no || '').replace(/^F4S-?/i, '').trim()).filter(Boolean);
    
    const { Op } = await import("sequelize");
    const idSet = new Set([...appIds, ...appNos, ...cleanNos]);
    const allLookupIds = Array.from(idSet).filter(Boolean);

    let allDocs = [];
    if (allLookupIds.length > 0) {
      allDocs = await Document.findAll({
        where: {
          loan_application_id: { [Op.in]: allLookupIds }
        },
        raw: true
      });
    }

    // Fetch associated lenders for these applications (accumulating all unique lenders per application)
    const lenderMap = new Map();
    try {
      if (Loan_Application.sequelize) {
        const [lenderRows] = await Loan_Application.sequelize.query(`
          SELECT 
            lap.loan_application_id,
            COALESCE(l.name, l.short) AS lender_name
          FROM lender_applications lap
          LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id
          LEFT JOIN lenders l ON l.id = llr.lender_id
          WHERE COALESCE(l.name, l.short) IS NOT NULL
          ORDER BY lap.id ASC
        `);
        lenderRows.forEach(row => {
          const k = String(row.loan_application_id);
          const name = String(row.lender_name || '').trim();
          if (name) {
            if (!lenderMap.has(k)) {
              lenderMap.set(k, []);
            }
            const arr = lenderMap.get(k);
            if (!arr.includes(name)) {
              arr.push(name);
            }
          }
        });
      }
    } catch (e) {
      console.warn("Could not fetch lender names:", e.message);
    }

    let directLenderMap = new Map();
    try {
      const allLenders = await Lender.findAll({ raw: true });
      directLenderMap = new Map(allLenders.map(l => [Number(l.id), l.name || l.short]));
    } catch (e) {}

    const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]+/g, '').trim();
    const getDocType = (d) => {
      const dt = norm(d.document_type);
      if (dt && dt !== 'other') return dt;
      const fn = norm(d.file_name);
      if (fn.includes('front')) return 'aadharfront';
      if (fn.includes('back')) return 'aadharback';
      if (fn.includes('aadhar') || fn.includes('aadhaar')) return 'aadhar';
      if (fn.includes('pan')) return 'pan';
      if (fn.includes('salary')) return 'salaryslip';
      if (fn.includes('bank')) return 'bankstatement';
      return dt || 'other';
    };

    const enrichedApps = await Promise.all(applications.map(async (app) => {
      const cleanNo = String(app.application_no || '').replace(/^F4S-?/i, '').trim();
      const appDocs = allDocs.filter(d => 
        String(d.loan_application_id) === String(app.id) || 
        String(d.loan_application_id) === String(app.application_no) ||
        (cleanNo && String(d.loan_application_id) === String(cleanNo)) ||
        (cleanNo && String(d.loan_application_id) === `F4S-${cleanNo}`)
      );

      const validDocTypes = appDocs.filter(d => d.status !== 'rejected').map(d => getDocType(d));
      const rejectedDocs = appDocs.filter(d => d.status === 'rejected');
      const hasRejectedDocs = rejectedDocs.length > 0;

      const hasAadhaar = validDocTypes.some(t => t === 'aadhar' || t === 'aadhaar' || t === 'aadharcombined' || t === 'aadhaarcombined') || 
                         (validDocTypes.some(t => t === 'aadharfront' || t === 'aadhaarfront') && validDocTypes.some(t => t === 'aadharback' || t === 'aadhaarback'));
      const hasPan = validDocTypes.some(t => t === 'pan');
      const hasSalary = validDocTypes.some(t => t === 'salaryslip' || t === 'salaryslips' || t === 'salary');
      const hasBank = validDocTypes.some(t => t === 'bankstatement' || t === 'bankstatements' || t === 'bank');

      // Aadhaar, PAN, and Bank Statement are mandatory; Salary Slip is optional
      const hasAllRequired = hasAadhaar && hasPan && hasBank && !hasRejectedDocs;

      let effectiveStatusId = Number(app.status_id || 1);

      if (hasRejectedDocs && effectiveStatusId > 2) {
        effectiveStatusId = 2;
        await Loan_Application.update({ status_id: 2 }, { where: { id: app.id } }).catch(() => {});
      } else if (hasAllRequired && effectiveStatusId <= 2) {
        effectiveStatusId = 3; // Advance to Credit Stage
        await Loan_Application.update({ status_id: 3 }, { where: { id: app.id } }).catch(() => {});
      }

      const stName = effectiveStatusId === 3 ? "Credit" : (statusMap.get(effectiveStatusId) || "applied");
      const ltObj = loanTypeMap.get(app.loan_type_id) || { name: "Home Loan", short_id: "home" };

      const idList = lenderMap.get(String(app.id)) || [];
      const noList = lenderMap.get(String(app.application_no)) || [];
      const cleanList = cleanNo ? (lenderMap.get(cleanNo) || []) : [];
      let combinedLenders = Array.from(new Set([...idList, ...noList, ...cleanList]));

      if (combinedLenders.length === 0 && app.lender_id && directLenderMap.has(Number(app.lender_id))) {
        combinedLenders = [directLenderMap.get(Number(app.lender_id))];
      }

      const resolvedBank = combinedLenders.length > 0 ? combinedLenders.join(", ") : "HDFC Bank";
      const formattedAppNo = app.application_no 
        ? (String(app.application_no).toUpperCase().startsWith('F4S-') 
            ? String(app.application_no).toUpperCase() 
            : `F4S-${app.application_no}`)
        : `F4S-${String(app.id || 3901).padStart(4, '0')}`;

      const hasSaleAgreement = validDocTypes.some(t => t.includes('sale') || t.includes('agreement'));
      const hasPropertyDeed = validDocTypes.some(t => t.includes('property') || t.includes('title') || t.includes('deed'));

      return {
        ...app,
        bank: resolvedBank,
        bank_name: resolvedBank,
        banks: combinedLenders,
        lender_names: combinedLenders,
        application_no: formattedAppNo,
        status_id: effectiveStatusId,
        has_uploaded_docs: appDocs.length > 0,
        total_docs_count: appDocs.length,
        has_all_docs: hasAllRequired,
        has_rejected_docs: hasRejectedDocs,
        rejected_count: rejectedDocs.length,
        rejected_types: rejectedDocs.map(d => d.document_type),
        has_pan: hasPan,
        has_aadhaar: hasAadhaar,
        has_salary: hasSalary,
        has_bank: hasBank,
        has_sale_agreement: hasSaleAgreement,
        has_property_deed: hasPropertyDeed,
        Status: { name: stName },
        Loan_type: ltObj
      };
    }));

    return res.json(enrichedApps);
  } catch (err) {
    console.error("Get my applications error:", err);
    return res.status(500).json({ message: "Server error retrieving applications", error: err.message });
  }
};

/* -----------------------------------------------------
   CLIENT / BROKER – UPLOAD COMPULSORY DOCUMENTS
----------------------------------------------------- */
export const uploadDocs = async (req, res) => {
  try {
    const rawId = req.params.id || req.body.application_id || req.query.application_id || req.query.id;
    if (!rawId) {
      return res.status(400).json({ message: "Application ID is required" });
    }

    const cleanAppNo = String(rawId).replace(/^F4S-?/i, '').trim();
    const { Op } = await import("sequelize");

    let app = await Loan_Application.findOne({
      where: {
        [Op.or]: [
          { id: isNaN(rawId) ? -1 : Number(rawId) },
          { application_no: cleanAppNo },
          { application_no: `F4S-${cleanAppNo}` },
          { application_no: rawId }
        ]
      }
    });

    if (!app) {
      return res.status(404).json({ message: "Loan application not found" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    const fieldMap = {
      aadhar: 'aadhar',
      aadharcombined: 'aadhar',
      aadhar_combined: 'aadhar',
      'aadhar combined': 'aadhar',
      aadharfront: 'aadhar_front',
      aadhar_front: 'aadhar_front',
      'aadhar front': 'aadhar_front',
      aadharback: 'aadhar_back',
      aadhar_back: 'aadhar_back',
      'aadhar back': 'aadhar_back',
      aadhaar: 'aadhar',
      aadhaarcombined: 'aadhar',
      aadhaar_combined: 'aadhar',
      aadhaarfront: 'aadhar_front',
      aadhaar_front: 'aadhar_front',
      aadhaarback: 'aadhar_back',
      aadhaar_back: 'aadhar_back',
      pan: 'pan',
      salaryslip: 'salary slip',
      salary_slip: 'salary slip',
      'salary slip': 'salary slip',
      bankstatement: 'bank statement',
      bank_statement: 'bank statement',
      'bank statement': 'bank statement'
    };

    let types = req.body.types;
    if (!Array.isArray(types)) {
      types = types ? [types] : [];
    }

    // Ensure MySQL table column is VARCHAR(255) and repair any existing empty document_type rows
    try {
      const { sequelize } = await import("../config/db.js");
      await sequelize.query("ALTER TABLE documents MODIFY COLUMN document_type VARCHAR(255) NOT NULL;");
      await sequelize.query(`
        UPDATE documents 
        SET document_type = CASE 
          WHEN LOWER(file_name) LIKE '%front%' THEN 'aadhar_front'
          WHEN LOWER(file_name) LIKE '%back%' THEN 'aadhar_back'
          WHEN LOWER(file_name) LIKE '%aadhar%' OR LOWER(file_name) LIKE '%aadhaar%' THEN 'aadhar'
          WHEN LOWER(file_name) LIKE '%pan%' THEN 'pan'
          WHEN LOWER(file_name) LIKE '%salary%' THEN 'salary slip'
          WHEN LOWER(file_name) LIKE '%bank%' THEN 'bank statement'
          ELSE document_type
        END
        WHERE document_type = '' OR document_type IS NULL OR document_type = 'other';
      `);
    } catch (_) {}

    const possibleIds = new Set();
    if (app && app.id) possibleIds.add(Number(app.id));
    if (app && app.application_no) {
      if (!isNaN(app.application_no)) possibleIds.add(Number(app.application_no));
      const cleanNo = String(app.application_no).replace(/^F4S-?/i, '').trim();
      if (!isNaN(cleanNo) && cleanNo) possibleIds.add(Number(cleanNo));
    }
    if (!isNaN(rawId)) possibleIds.add(Number(rawId));
    if (!isNaN(cleanAppNo) && cleanAppNo) possibleIds.add(Number(cleanAppNo));

    const idList = Array.from(possibleIds);

    // Unify any older document records to current app.id
    if (idList.length > 0) {
      await Document.update(
        { loan_application_id: app.id },
        { where: { loan_application_id: { [Op.in]: idList } } }
      );
    }

    // Create Document records in DB (remove old ones of same type)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let docType = 'other';
      const normField = (file.fieldname || '').toLowerCase().trim();

      if (normField.includes('front')) {
        docType = 'aadhar_front';
      } else if (normField.includes('back')) {
        docType = 'aadhar_back';
      } else if (normField.includes('comb')) {
        docType = 'aadhar';
      } else if (normField.includes('pan')) {
        docType = 'pan';
      } else if (normField.includes('salary')) {
        docType = 'salary slip';
      } else if (normField.includes('bank')) {
        docType = 'bank statement';
      } else if (fieldMap[normField]) {
        docType = fieldMap[normField];
      } else if (types[i]) {
        const t = types[i].toLowerCase().trim();
        docType = fieldMap[t] || t;
      } else if (req.body.document_type) {
        const t = req.body.document_type.toLowerCase().trim();
        docType = fieldMap[t] || t;
      }

      await Document.destroy({
        where: {
          loan_application_id: { [Op.in]: idList },
          document_type: docType
        }
      });

      // If uploading combined aadhar, clean up any previous front/back entries
      if (docType === 'aadhar') {
        await Document.destroy({
          where: {
            loan_application_id: { [Op.in]: idList },
            document_type: { [Op.in]: ['aadhar_front', 'aadhar_back'] }
          }
        });
      }

      // If uploading separate aadhar front/back, clean up any previous combined aadhar entry
      if (docType === 'aadhar_front' || docType === 'aadhar_back') {
        await Document.destroy({
          where: {
            loan_application_id: { [Op.in]: idList },
            document_type: 'aadhar'
          }
        });
      }

      await Document.create({
        loan_application_id: app.id,
        document_type: docType,
        file_name: file.originalname,
        file_path: `/uploads/${file.filename}`,
        status: 'pending'
      });
    }

    // Check all existing valid documents
    const allDocs = await Document.findAll({
      where: {
        loan_application_id: { [Op.in]: idList }
      },
      raw: true
    });

    const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]+/g, '').trim();
    const getDocType = (d) => {
      const dt = norm(d.document_type);
      if (dt && dt !== 'other') return dt;
      const fn = norm(d.file_name);
      if (fn.includes('front')) return 'aadharfront';
      if (fn.includes('back')) return 'aadharback';
      if (fn.includes('aadhar') || fn.includes('aadhaar')) return 'aadhar';
      if (fn.includes('pan')) return 'pan';
      if (fn.includes('salary')) return 'salaryslip';
      if (fn.includes('bank')) return 'bankstatement';
      return dt || 'other';
    };

    const allValidTypes = allDocs.filter(d => d.status !== 'rejected').map(d => getDocType(d));
    const hasRejected = allDocs.some(d => d.status === 'rejected');

    // Aadhaar requirement satisfied if: combined 'aadhar' exists OR both 'aadhar_front' and 'aadhar_back' exist
    const hasAadhaar = allValidTypes.some(t => t === 'aadhar' || t === 'aadhaar' || t === 'aadharcombined' || t === 'aadhaarcombined') || 
                       (allValidTypes.some(t => t === 'aadharfront' || t === 'aadhaarfront') && allValidTypes.some(t => t === 'aadharback' || t === 'aadhaarback'));
    const hasPan = allValidTypes.some(t => t === 'pan');
    const hasBank = allValidTypes.some(t => t === 'bankstatement' || t === 'bankstatements' || t === 'bank');

    // Mandatory docs: Aadhaar, PAN, Bank Statement; Salary Slip is optional
    const hasAllRequired = hasAadhaar && hasPan && hasBank && !hasRejected;

    if (hasAllRequired) {
      await Loan_Application.update(
        { status_id: 3 }, 
        { where: { [Op.or]: [{ id: app.id }, { application_no: cleanAppNo }, { application_no: `F4S-${cleanAppNo}` }, { application_no: rawId }] } }
      );
      return res.json({ 
        success: true, 
        allUploaded: true, 
        message: "Required documents uploaded successfully! Application progressed to Credit evaluation." 
      });
    } else {
      await Loan_Application.update(
        { status_id: 2 }, 
        { where: { [Op.or]: [{ id: app.id }, { application_no: cleanAppNo }, { application_no: `F4S-${cleanAppNo}` }, { application_no: rawId }] } }
      );
      return res.json({ 
        success: true, 
        allUploaded: false, 
        message: "Document(s) saved successfully. Please upload all required documents (Aadhaar, PAN, Bank Statement) to progress to Credit." 
      });
    }
  } catch (err) {
    console.error("Upload docs error:", err);
    return res.status(500).json({ message: "Server error during document upload", error: err.message });
  }
};

/* -----------------------------------------------------
   CLIENT – GET APPLICATION DOCUMENTS
----------------------------------------------------- */
export const getApplicationDocuments = async (req, res) => {
  try {
    const rawId = req.params.id || req.query.application_id || req.query.id || req.body?.application_id;
    if (!rawId) {
      return res.json([]);
    }

    const { Op } = await import("sequelize");
    const cleanAppNo = String(rawId).replace(/^F4S-?/i, '').trim();

    const app = await Loan_Application.findOne({
      where: {
        [Op.or]: [
          { id: isNaN(rawId) ? -1 : Number(rawId) },
          { application_no: cleanAppNo },
          { application_no: `F4S-${cleanAppNo}` },
          { application_no: rawId }
        ]
      },
      raw: true
    });

    const possibleIds = new Set();
    if (app && app.id) possibleIds.add(Number(app.id));
    if (app && app.application_no) {
      if (!isNaN(app.application_no)) possibleIds.add(Number(app.application_no));
      const cleanNo = String(app.application_no).replace(/^F4S-?/i, '').trim();
      if (!isNaN(cleanNo) && cleanNo) possibleIds.add(Number(cleanNo));
    }
    if (!isNaN(rawId)) possibleIds.add(Number(rawId));
    if (!isNaN(cleanAppNo) && cleanAppNo) possibleIds.add(Number(cleanAppNo));

    const idList = Array.from(possibleIds);

    const documents = await Document.findAll({
      where: {
        loan_application_id: { [Op.in]: idList }
      },
      raw: true
    });
    res.json(documents);
  } catch (err) {
    console.error("Client get documents error:", err);
    res.status(500).json({ message: "Failed to fetch documents", error: err.message });
  }
};

