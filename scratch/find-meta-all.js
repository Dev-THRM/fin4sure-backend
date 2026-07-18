import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.antigravity')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/finn4sure/fin4sure-frontend');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('F4S') || content.includes('F4S-') || content.includes('Lender?.name')) {
    console.log("MATCH IN FILE:", file);
  }
});
