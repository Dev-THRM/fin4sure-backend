import connectDB, { sequelize } from './config/db.js';

const dropAll = async () => {
  try {
    await connectDB();
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;").catch(() => {});
    await sequelize.query("DROP TABLE IF EXISTS SequelizeMeta;").catch(() => {});
    await sequelize.drop();
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;").catch(() => {});
    console.log("Successfully dropped all tables to reset the database.");
    process.exit(0);
  } catch (err) {
    console.error("Error dropping tables:", err);
    process.exit(1);
  }
};

dropAll();
