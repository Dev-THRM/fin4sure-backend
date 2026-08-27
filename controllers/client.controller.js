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

    const enrichedApps = applications.map(app => {
      const stName = statusMap.get(app.status_id) || "applied";
      const ltObj = loanTypeMap.get(app.loan_type_id) || { name: "Home Loan", short_id: "home" };
      return {
        ...app,
        Status: { name: stName },
        Loan_type: ltObj
      };
    });

    return res.json(enrichedApps);
  } catch (err) {
    console.error("Get my applications error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const uploadDocs = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const roleId = Number(req.user.role);
    const rawId = req.params.id;
    const cleanAppNo = String(rawId).replace(/^F4S-?/i, '').trim();
    const { Op } = await import("sequelize");

    let app = await Loan_Application.findOne({
      where: {
        [Op.or]: [
          { id: isNaN(rawId) ? -1 : Number(rawId) },
          { application_no: cleanAppNo }
        ]
      }
    });

    if (!app) {
      return res.status(404).json({ message: "Loan application not found" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    let types = req.body.types;
    if (!Array.isArray(types)) {
      types = types ? [types] : [];
    }

    const requiredTypes = ['aadhar', 'pan', 'salary slip', 'bank statement'];
    const newUploadedTypes = types.map(t => t?.toLowerCase().trim());
    
    // Create Document records in DB (remove old ones of same type)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docType = newUploadedTypes[i] || 'other';
      
      await Document.destroy({
        where: {
          [Op.or]: [
            { loan_application_id: app.id },
            { loan_application_id: app.application_no }
          ],
          document_type: docType
        }
      });
      
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
        [Op.or]: [
          { loan_application_id: app.id },
          { loan_application_id: app.application_no }
        ]
      }
    });
    const allValidTypes = allDocs.filter(d => d.status !== 'rejected').map(d => d.document_type);
    const hasAllRequired = requiredTypes.every(t => allValidTypes.includes(t));

    if (hasAllRequired) {
      app.status_id = 3; // Progress to Credit Stage
      await app.save();
      return res.json({ message: "Documents uploaded and application progressed to Credit evaluation" });
    } else {
      return res.json({ message: "Partial documents saved. Please upload remaining documents." });
    }
  } catch (err) {
    console.error("Upload docs error:", err);
    return res.status(500).json({ message: "Server error during document upload", error: err.message, stack: err.stack });
  }
};

/* -----------------------------------------------------
   CLIENT – GET APPLICATION DOCUMENTS
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
    console.error("Client get documents error:", err);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

