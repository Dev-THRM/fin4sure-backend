import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-frontend/src/pages/styles/clientDashboard.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('cdl-') || line.includes('cdl_card')) {
    console.log(`${index + 1}: ${line}`);
  }
});
