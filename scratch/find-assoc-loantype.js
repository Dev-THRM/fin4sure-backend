import fs from 'fs';

const content = fs.readFileSync('d:/finn4sure/fin4sure-backend/models/associations.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('loanType')) {
    console.log(`${index + 1}: ${line}`);
  }
});
