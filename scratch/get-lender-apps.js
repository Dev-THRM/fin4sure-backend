import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [lenderApps] = await sequelize.query(`
      SELECT la.*, l.name AS lender_name
      FROM Lender_Applications la
      LEFT JOIN Lenders l ON la.lender_id = l.id
    `);
    console.log("LENDER APPLICATIONS:", lenderApps);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
