import { sequelize } from '../config/db.js';

async function checkStats() {
  try {
    // Check all statuses
    const [statuses] = await sequelize.query("SELECT * FROM statuses");
    console.log("Statuses:", statuses);

    // Check each status count
    const [statusCounts] = await sequelize.query(`
      SELECT s.name, COUNT(la.id) as count
      FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      GROUP BY s.id, s.name
    `);
    console.log("Applications by status:", statusCounts);

    // Total loan volume
    const [volume] = await sequelize.query(`
      SELECT SUM(loan_amount) as total_volume, COUNT(*) as total_apps FROM loan_applications
    `);
    console.log("Loan volume & total:", volume[0]);

    // Active borrowers (clients table)
    const [activeBorrowers] = await sequelize.query("SELECT COUNT(*) as count FROM clients");
    console.log("Clients (borrowers):", activeBorrowers[0].count);

    // Active partners
    const [activePartners] = await sequelize.query("SELECT COUNT(*) as count FROM users WHERE role_id = 2 AND status = 'active'");
    console.log("Active partners:", activePartners[0].count);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

checkStats();
