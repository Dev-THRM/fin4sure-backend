import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.antigravity') && !file.includes('scratch')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/finn4sure/fin4sure-backend');
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('loanType')) {
      console.log("MATCH:", file);
    }
  } catch (e) {}
});
