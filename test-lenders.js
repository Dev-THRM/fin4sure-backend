import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'fin4sure_v2'
  });

  const [lenderApps] = await connection.execute(`
    SELECT lap.loan_application_id, lap.status, l.name
    FROM lender_applications lap
    LEFT JOIN lender_loan_rates llr ON lap.lender_rate_id = llr.id
    LEFT JOIN lenders l ON llr.lender_id = l.id
    WHERE lap.loan_application_id = 25312
  `);
  console.log('Lender Apps:', lenderApps);

  const [loans] = await connection.execute(`
    SELECT lender_id, client_preference, direct_lender_name
    FROM loan_applications
    WHERE id = 25312
  `);
  console.log('Loan Application:', loans);
  
  await connection.end();
}
test();
