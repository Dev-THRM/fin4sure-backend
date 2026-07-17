import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [user] = await sequelize.query("SELECT * FROM Users WHERE id = 14");
    console.log("USER 14:", user);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
