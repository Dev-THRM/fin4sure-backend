import connectDB, { sequelize } from './config/db.js';

const wipe = async () => {
  try {
    await connectDB();
    
    // Disable constraints
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");
    
    // Get all tables in the database
    const [tables] = await sequelize.query("SHOW TABLES;");
    
    // Drop every single table explicitly
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      console.log(`Dropped table: ${tableName}`);
    }
    
    // Re-enable constraints
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");
    
    console.log("Database wiped completely (including Users & SequelizeMeta)!");
    process.exit(0);
  } catch (err) {
    console.error("Error wiping database:", err);
    process.exit(1);
  }
};

wipe();
