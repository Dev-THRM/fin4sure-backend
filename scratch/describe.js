import { sequelize } from "../config/db.js";

async function run() {
  try {
    const [results] = await sequelize.query("DESCRIBE Lender_Applications");
    console.log("TABLE Lender_Applications SCHEMA:", results);

    const [foreignKeys] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'Lender_Applications' AND TABLE_SCHEMA = DATABASE()
    `);
    console.log("FOREIGN KEYS:", foreignKeys);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

run();
