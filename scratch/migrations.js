import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [meta] = await sequelize.query("SELECT * FROM SequelizeMeta");
    console.log("RUN MIGRATIONS:", meta.map(m => m.name));

    const [tables] = await sequelize.query("SHOW TABLES");
    console.log("TABLES IN DATABASE:", tables);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
