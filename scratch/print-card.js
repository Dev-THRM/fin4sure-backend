import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/ClientDashboard.jsx', 'utf8');
const lines = content.split('\n');
for (let i = 301; i < 373; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
