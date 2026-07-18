import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/ClientDashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('Lender') || line.includes('amount') || line.includes('application_no') || line.includes('applicationNo')) {
    console.log(`${index + 1}: ${line}`);
  }
});
