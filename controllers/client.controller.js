import Client from "../models/client.model.js";
import jwt from "jsonwebtoken";
import Loan_Application from "../models/loan_application.js";
import Status from "../models/status.js";
import Loan_type from "../models/loan_type.js";
import Lender from "../models/lender.js";
import Document from "../models/document.js";
import Partner from "../models/partner.model.js";


// ----------------- GETS THE PRODUCT CLINET APPLIED FOR -----------------
export const getClientProducts = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
    const client = await Client.findByPk(id, {
      attributes: ['product']
    });

    if(!client) {
      return res.status(404).json({message : "no product found"})
    }
    return res.json(client.product);

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

    const client = await Client.findByPk(id);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Since product is a JSON array, we need to get the existing array, push, and set it again
    const currentProducts = client.product || [];
    currentProducts.push({
      product,
      status: "pending"
    });

    client.product = currentProducts;
    
    // Explicitly tell Sequelize that the JSON field has changed
    client.changed('product', true);
    await client.save();

    return res.json({ message: "Product application submitted" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const applications = await Loan_Application.findAll({
      where: { user_id: userId },
      include: [
        { model: Status, attributes: ['name'] },
        { model: Loan_type, attributes: ['name', 'short_id'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(applications);
  } catch (err) {
    console.error("Get my applications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const uploadDocs = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const roleId = Number(req.user.role);
    const applicationId = req.params.id;

    let app;
    if (roleId === 2) {
      // Find partner record for the user
      const partner = await Partner.findOne({ where: { user_id: userId } });
      if (!partner) {
        return res.status(403).json({ message: "Partner record not found." });
      }
      app = await Loan_Application.findOne({
        where: { id: applicationId, partner_id: partner.id }
      });
    } else {
      app = await Loan_Application.findOne({
        where: { id: applicationId, user_id: userId }
      });
    }

    if (!app) {
      return res.status(404).json({ message: "Loan application not found or unauthorized access" });
    }

    const { files } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ message: "Invalid documents payload." });
    }

    const requiredTypes = ['aadhar', 'pan', 'salary slip', 'bank statement'];
    const uploadedTypes = files.map(f => f.type?.toLowerCase().trim());
    const hasAllRequired = requiredTypes.every(t => uploadedTypes.includes(t));

    if (!hasAllRequired) {
      return res.status(400).json({ message: "Aadhaar, PAN, salary slips, and bank statements are all required to progress the application." });
    }

    // Create Document records in DB
    for (const file of files) {
      await Document.create({
        loan_application_id: applicationId,
        document_type: file.type,
        file_name: file.name,
        file_path: `/uploads/${file.name}`,
        status: 'pending'
      });
    }

    // Progress status_id to 3 (credit)
    app.status_id = 3;
    await app.save();

    return res.json({ message: "Documents uploaded and application progressed to Credit evaluation" });
  } catch (err) {
    console.error("Upload docs error:", err);
    return res.status(500).json({ message: "Server error during document upload" });
  }
};