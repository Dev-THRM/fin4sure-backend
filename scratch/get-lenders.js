import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [lenders] = await sequelize.query("SELECT * FROM Lenders");
    console.log("LENDERS:", lenders);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
