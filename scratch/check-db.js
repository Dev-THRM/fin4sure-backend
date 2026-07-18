import { sequelize } from '../config/db.js';

async function check() {
  try {
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("Tables in database:", results);
    for (const row of results) {
      const tableName = Object.values(row)[0];
      const [columns] = await sequelize.query(`DESCRIBE \`${tableName}\``);
      console.log(`\nTable: ${tableName}`);
      console.log(columns.map(c => `${c.Field} (${c.Type})`));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

check();
