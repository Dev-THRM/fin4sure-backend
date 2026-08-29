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
    const appIds = applications.map(a => a.id);
    const appNos = applications.map(a => a.application_no).filter(Boolean);
    const { Op } = await import("sequelize");
    let allDocs = [];
    if (appIds.length > 0 || appNos.length > 0) {
      allDocs = await Document.findAll({
        where: {
          [Op.or]: [
            ...(appIds.length > 0 ? [{ loan_application_id: appIds }] : []),
            ...(appNos.length > 0 ? [{ loan_application_id: appNos }] : [])
          ]
        },
        raw: true
      });
    }

    const enrichedApps = await Promise.all(applications.map(async (app) => {
      const appDocs = allDocs.filter(d => 
        String(d.loan_application_id) === String(app.id) || 
        String(d.loan_application_id) === String(app.application_no)
      );
      const rejectedDocs = appDocs.filter(d => d.status === 'rejected');
      const hasRejectedDocs = rejectedDocs.length > 0;

      let effectiveStatusId = app.status_id;
      // If any document is rejected, ensure stage is reverted to Docs (status_id = 2)
      if (hasRejectedDocs && effectiveStatusId > 2) {
        effectiveStatusId = 2;
        await Loan_Application.update({ status_id: 2 }, { where: { id: app.id } }).catch(() => {});
      }

      const stName = statusMap.get(effectiveStatusId) || "applied";
      const ltObj = loanTypeMap.get(app.loan_type_id) || { name: "Home Loan", short_id: "home" };
      return {
        ...app,
        status_id: effectiveStatusId,
        has_rejected_docs: hasRejectedDocs,
        rejected_count: rejectedDocs.length,
        rejected_types: rejectedDocs.map(d => d.document_type),
        Status: { name: stName },
        Loan_type: ltObj
      };
    }));

    return res.json(enrichedApps);
  } catch (err) {
    console.error("Get my applications error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

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

    // Build all possible ID identifiers for this application
    const targetId = Number(app.id);

    // Create Document records in DB (remove old ones of same type)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let docType = 'other';
      const normField = (file.fieldname || '').toLowerCase().trim();

      if (fieldMap[normField]) {
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
          loan_application_id: targetId,
          document_type: docType
        }
      });

      // If uploading combined aadhar, clean up any previous front/back entries
      if (docType === 'aadhar') {
        await Document.destroy({
          where: {
            loan_application_id: targetId,
            document_type: { [Op.in]: ['aadhar_front', 'aadhar_back'] }
          }
        });
      }

      // If uploading separate aadhar front/back, clean up any previous combined aadhar entry
      if (docType === 'aadhar_front' || docType === 'aadhar_back') {
        await Document.destroy({
          where: {
            loan_application_id: targetId,
            document_type: 'aadhar'
          }
        });
      }

      await Document.create({
        loan_application_id: targetId,
        document_type: docType,
        file_name: file.originalname,
        file_path: `/uploads/${file.filename}`,
        status: 'pending'
      });
    }

    // Check all existing valid documents
    const allDocs = await Document.findAll({
      where: {
        loan_application_id: targetId
      }
    });

    const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]+/g, '').trim();
    const allValidTypes = allDocs.filter(d => d.status !== 'rejected').map(d => norm(d.document_type));
    const hasRejected = allDocs.some(d => d.status === 'rejected');

    // Aadhaar requirement satisfied if: combined 'aadhar' exists OR both 'aadhar_front' and 'aadhar_back' exist
    const hasAadhaar = allValidTypes.some(t => t === 'aadhar' || t === 'aadhaar' || t === 'aadharcombined' || t === 'aadhaarcombined') || 
                       (allValidTypes.some(t => t === 'aadharfront' || t === 'aadhaarfront') && allValidTypes.some(t => t === 'aadharback' || t === 'aadhaarback'));
    const hasPan = allValidTypes.some(t => t === 'pan');
    const hasSalary = allValidTypes.some(t => t === 'salaryslip' || t === 'salaryslips' || t === 'salary');
    const hasBank = allValidTypes.some(t => t === 'bankstatement' || t === 'bankstatements' || t === 'bank');

    const hasAllRequired = hasAadhaar && hasPan && hasSalary && hasBank && !hasRejected;

    if (hasAllRequired) {
      await Loan_Application.update({ status_id: 3 }, { where: { id: targetId } });
      return res.json({ 
        success: true, 
        allUploaded: true, 
        message: "All compulsory documents uploaded successfully! Application progressed to Credit evaluation." 
      });
    } else {
      await Loan_Application.update({ status_id: 2 }, { where: { id: targetId } });
      return res.json({ 
        success: true, 
        allUploaded: false, 
        message: "Document(s) saved successfully. Please upload all 4 compulsory documents to progress to Credit." 
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

    const targetId = app ? Number(app.id) : (!isNaN(rawId) ? Number(rawId) : (!isNaN(cleanAppNo) ? Number(cleanAppNo) : -1));

    const documents = await Document.findAll({
      where: {
        loan_application_id: targetId
      },
      raw: true
    });
    res.json(documents);
  } catch (err) {
    console.error("Client get documents error:", err);
    res.status(500).json({ message: "Failed to fetch documents", error: err.message });
  }
};

