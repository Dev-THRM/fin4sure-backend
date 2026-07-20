import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [apps] = await sequelize.query("SELECT id, user_id, status_id, createdAt FROM Loan_Applications");
    console.log("APPLICATIONS:", apps);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
