import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/ClientDashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('received') || line.toLowerCase().includes('touch') || line.toLowerCase().includes('remark')) {
    console.log(`${index + 1}: ${line}`);
  }
});
