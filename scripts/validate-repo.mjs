import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'package.json',
  'backend/package.json',
  'frontend/package.json'
];

const conflictPatterns = [/^<<<<<<< /m, /^=======$/m, /^>>>>>>> /m];

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
};

let hasErrors = false;

for (const rel of targets) {
  const abs = path.join(root, rel);
  try {
    JSON.parse(fs.readFileSync(abs, 'utf8'));
    console.log(`OK JSON: ${rel}`);
  } catch (error) {
    hasErrors = true;
    console.error(`ERROR JSON inválido en ${rel}: ${error.message}`);
  }
}

for (const abs of walk(root)) {
  if (abs.endsWith('.pdf')) {
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  if (conflictPatterns.some((pattern) => pattern.test(content))) {
    hasErrors = true;
    console.error(`ERROR conflicto de merge detectado en: ${path.relative(root, abs)}`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Integridad OK: sin conflictos de merge y JSON válido.');
