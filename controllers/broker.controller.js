import Broker from "../models/broker.model.js";
import Client from "../models/client.model.js";
import Lead from "../models/lead.model.js";

// ----------------- GETTING CLIENT DETAILS OF THE BROKER(INDIVIDUAL) -----------------
export const getReferredClients = async (req, res) => {
  try {
    const id = req.user.id || req.user._id; // Accommodate JWT payload during transition
    const broker = await Broker.findByPk(id);

    if (!broker || !broker.brokerId) {
      return res.status(404).json({ message: "Broker not found" });
    }
    const brokerid = broker.brokerId;
    const clients = await Client.findAll({
      where: { broker_id: brokerid },
      attributes: { exclude: ['password'] }
    });

    return res.json({
      count: clients.length,
      clients,
    });
  } catch (err) {
    console.error("Get broker clients error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ----------------- GETTING LEADS DATA OF BROKER(INDIVIDUAL) -----------------
export const getBrokerLeads = async (req, res) => {
  try {
    const id = req.user.id || req.user._id;

    const broker = await Broker.findByPk(id);

    if (!broker || !broker.brokerId) {
      return res.status(404).json({ message: "Broker not found" });
    };

    const brokerid = broker.brokerId;
    const leads = await Lead.findAll({
      where: { broker_id: brokerid },
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
    console.error("Get broker leads error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
