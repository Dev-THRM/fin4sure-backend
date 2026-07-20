import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [apps] = await sequelize.query("SELECT * FROM Loan_Applications WHERE user_id = 14 LIMIT 1");
    console.log("APP 12:", apps[0]);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
