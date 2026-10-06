// Names that must never appear in anything public. The list itself is private:
// it lives in the private overlay directory as forbidden-terms.txt, one term
// per line. When the file is absent (CI, a fresh clone) the dependent tests
// are skipped.
const fs = require('fs');
const path = require('path');

const PRIVATE_DIR = process.env.RESUME_PRIVATE_DIR || path.join(__dirname, '..', 'private');
const FILE = path.join(PRIVATE_DIR, 'forbidden-terms.txt');

function forbiddenPattern() {
  if (!fs.existsSync(FILE)) return null;
  const terms = fs.readFileSync(FILE, 'utf8').split('\n').map((t) => t.trim()).filter((t) => t && !t.startsWith('#'));
  if (!terms.length) return null;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

module.exports = { forbiddenPattern, FILE, PRIVATE_DIR };
