import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [users] = await sequelize.query("SELECT id, name, email, mob_no, role_id FROM Users LIMIT 10");
    console.log("USERS:", users);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
