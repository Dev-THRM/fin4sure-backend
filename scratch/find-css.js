import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/styles/clientDashboard.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('in-progress') || line.toLowerCase().includes('progress') || line.toLowerCase().includes('active')) {
    console.log(`${index + 1}: ${line}`);
  }
});
