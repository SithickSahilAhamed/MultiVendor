#!/usr/bin/env node
/**
 * AUTH-002 — fail if known demo password pairs appear in shipped client paths.
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const patterns = [
  'admin123',
  "password: 'admin123'",
  'password: "admin123"',
  'value="admin123"',
];

const scopes = [
  'sunfara/js',
  'sunfara/admin.html',
  'sunfara/README.md',
  'js/admin',
  'js/admin.js',
  '.env.example',
];

let hits = [];
for (const pattern of patterns) {
  try {
    const out = execSync(
      `rg -n --fixed-strings ${JSON.stringify(pattern)} ${scopes.join(' ')} || true`,
      { cwd: root, encoding: 'utf8', shell: '/bin/bash' }
    ).trim();
    if (out) hits.push({ pattern, out });
  } catch (e) {
    // rg exit 1 = no match
  }
}

// Also ban the classic pair on one line / adjacent demo credential docs in client JS
try {
  const pair = execSync(
    `rg -n "admin@sunfara\\.com" sunfara/js js/admin js/admin.js sunfara/README.md .env.example || true`,
    { cwd: root, encoding: 'utf8', shell: '/bin/bash' }
  ).trim();
  if (pair) hits.push({ pattern: 'admin@sunfara.com', out: pair });
} catch (_) {}

if (hits.length) {
  console.error('AUTH-002 FAIL — demo credential strings still present:\n');
  for (const h of hits) {
    console.error('---', h.pattern);
    console.error(h.out);
  }
  process.exit(1);
}

console.log('ok - no demo password / admin@sunfara.com strings in client scopes (AUTH-002)');
console.log('1 assertion passed');
