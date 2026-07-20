import { getBrokerLeads } from "../controllers/broker.controller.js";

// Mock request and response to test the function
const req = {
  user: {
    _id: 16 // The partner's user ID shown in the screenshot is ID: 16 (Himanshu)
  }
};

const res = {
  json: (data) => {
    console.log("SUCCESS:", data);
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
