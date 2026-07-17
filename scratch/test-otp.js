import { sendOTPService } from "../services/auth.service.js";
import { sequelize } from "../config/db.js";

async function run() {
  try {
    const result = await sendOTPService("7058633335");
    console.log("SUCCESS:", result);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
