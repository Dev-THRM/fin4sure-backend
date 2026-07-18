import { sequelize } from "../config/db.js";

async function run() {
  try {
    const result = await sequelize.query("UPDATE Loan_Applications SET status_id = 2 WHERE user_id = 14");
    console.log("UPDATED APPLICATION STATUSES TO DOCS FOR USER 14:", result);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
