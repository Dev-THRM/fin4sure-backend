import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [statuses] = await sequelize.query("SELECT * FROM Statuses");
    console.log("STATUSES:", statuses);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
