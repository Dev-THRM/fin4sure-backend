import { brokersWithFullData } from '../controllers/admin.controller.js';

async function test() {
  try {
    const mockRes = {
      json: (data) => console.log("Returned Brokers List:", JSON.stringify(data, null, 2)),
      status: (code) => ({ json: (err) => console.error("Error:", code, err) })
    };
    await brokersWithFullData({}, mockRes);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    process.exit(0);
  }
}

test();
