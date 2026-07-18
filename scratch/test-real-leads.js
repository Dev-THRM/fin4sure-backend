import { setupAssociations } from "../models/associations.js";
import { getBrokerLeads } from "../controllers/broker.controller.js";

setupAssociations();

const req = {
  user: {
    _id: 16
  }
};

const res = {
  json: (data) => {
    console.log("SUCCESS:", JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log("STATUS:", code);
    return {
      json: (err) => console.log("ERROR JSON:", err)
    };
  }
};

async function run() {
  try {
    await getBrokerLeads(req, res);
  } catch (err) {
    console.error("CAUGHT ERROR:", err);
  }
}

run();
