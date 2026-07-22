import { sequelize } from './config/db.js';
async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    await sequelize.query("ALTER TABLE borrowers MODIFY COLUMN profile_status ENUM('Active', 'Inactive', 'Completed', 'Incomplete', 'Under Review', 'Rejected') DEFAULT 'Active';");
    console.log('Enum updated successfully!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
