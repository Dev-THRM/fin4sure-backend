import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/ClientDashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('===') || line.includes('status') || line.includes('chip') || line.includes('class')) {
    if (line.includes('status') || line.includes('Status') || line.includes('step')) {
      console.log(`${index + 1}: ${line}`);
    }
  }
});
