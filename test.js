import { sequelize } from "./config/db.js"; 
async function run() { 
  const [res] = await sequelize.query(`
    SELECT lap.loan_application_id, lap.status AS lap_status, lap.finalized_rate, COALESCE(l.name, l.short) AS lender_name 
    FROM lender_applications lap 
    LEFT JOIN lender_loan_rates llr ON llr.id = lap.lender_rate_id 
    LEFT JOIN lenders l ON l.id = llr.lender_id 
    ORDER BY lap.id ASC
  `); 
  console.log(res); 
  process.exit(0); 
} 
run();
