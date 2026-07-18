import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [apps] = await sequelize.query(`
      SELECT 
        la.id, 
        la.user_id, 
        la.status_id, 
        s.name AS status_name
      FROM Loan_Applications la
      LEFT JOIN Statuses s ON la.status_id = s.id
      WHERE la.user_id = 14
    `);
    console.log("APPLICATIONS FOR USER 14:", apps);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
