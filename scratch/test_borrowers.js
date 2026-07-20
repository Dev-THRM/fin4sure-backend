const { sequelize, Client, Loan_Application, Status } = require('./models'); // adjust path if needed

async function test() {
  // active borrowers count
  const q = `
    SELECT COUNT(DISTINCT c.id) as count
    FROM clients c
    WHERE NOT EXISTS (
      SELECT 1 FROM loan_applications la
      WHERE la.user_id = c.id
    )
    OR EXISTS (
      SELECT 1 FROM loan_applications la
      JOIN statuses s ON la.status_id = s.id
      WHERE la.user_id = c.id AND s.name NOT IN ('disbursed', 'completed', 'rejected')
    )
  `;
  const [result] = await sequelize.query(q);
  console.log("Active Borrowers Count:", result[0].count);
}
test();
