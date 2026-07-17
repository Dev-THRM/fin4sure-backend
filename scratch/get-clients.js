import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [clients] = await sequelize.query("SELECT id, name, email, number FROM Clients LIMIT 10");
    console.log("CLIENTS:", clients);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
