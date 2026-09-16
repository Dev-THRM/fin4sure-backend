import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, 
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`MySQL Connected: ${process.env.DB_HOST}`);

    // Auto-migration for missing column on Hostinger
    try {
      await sequelize.query("ALTER TABLE loan_applications ADD COLUMN client_preference ENUM('direct_reach', 'partner_routing') DEFAULT NULL;");
      console.log("Migration: Added client_preference column");
    } catch (err) {
      // Column already exists or other error, safe to ignore
    }

    try {
      await sequelize.query("ALTER TABLE loan_applications ADD COLUMN partner_id INT DEFAULT NULL;");
      console.log("Migration: Added partner_id column");
    } catch (err) {
      // Column already exists or other error, safe to ignore
    }

    try {
      await sequelize.query("UPDATE loan_applications SET status_id = 2 WHERE status_id = 1;");
      console.log("Migration: Updated initial applied loans to status_id = 2 (Docs)");
    } catch (err) {
      // Safe to ignore
    }

    try {
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN dob DATE NULL;");
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN gender ENUM('male', 'female', 'other') NULL;");
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN address VARCHAR(255) NULL;");
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN pincode_id INT NULL;");
      await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN profile_status ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected') DEFAULT 'Active' NULL;");
      console.log("Migration: Updated borrowers fields to nullable");
    } catch (err) {
      // Safe to ignore if already modified
    }

    try {
      await sequelize.query("ALTER TABLE users ADD UNIQUE (email);");
      console.log("Migration: Added unique constraint to users.email");
    } catch (err) {
      // Safe to ignore if unique index already exists
    }
  } catch (error) {
    console.error(`MySQL connection error: ${error.message}`);
  }
};

export { sequelize };
export default connectDB;