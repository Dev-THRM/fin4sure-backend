import Client from "../models/client.model.js";
import Lead from "../models/lead.model.js";

// ----------------- GETTING CLIENT DETAILS OF THE PARTNER(INDIVIDUAL) -----------------
export const getReferredClients = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;
    const clients = await Client.findAll({
      where: { broker_id: String(id) },
      attributes: { exclude: ['password'] }
    });

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
    const leads = await Lead.findAll({
      where: { broker_id: String(id) },
      order: [['createdAt', 'DESC']]
    });

    const Leads = leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        number: lead.number,
        product: lead.product,
        status: lead.status, // pending | approved | rejected
        createdAt: lead.createdAt,
      }
    ));
    
    return res.json({
      count: leads.length,
      leads: Leads
    });
  } catch (err) {
    console.error("Get partner leads error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
