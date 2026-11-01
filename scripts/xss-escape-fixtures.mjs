#!/usr/bin/env node
/**
 * SEC-001 XSS escape fixtures (Phase 5).
 * Mirrors sunfara/js/utils.js escapeHtml — keep in sync if the helper changes.
 */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const fixtures = [
  { name: 'img onerror', input: `<img src=x onerror=alert(1)>`, mustContain: ['&lt;img', '&gt;'], mustNotContain: ['<img'] },
  { name: 'script tag', input: `<script>alert('xss')</script>`, mustContain: ['&lt;script&gt;', '&lt;/script&gt;'], mustNotContain: ['<script>'] },
  { name: 'attribute breakout', input: `" onmouseover="alert(1)`, mustContain: ['&quot;'], mustNotContain: ['" onmouseover'] },
  { name: 'ampersand', input: `A & B`, mustContain: ['&amp;'], mustNotContain: [] },
  { name: 'nullish', input: null, mustContain: [], mustNotContain: ['null'] },
];

let failed = 0;
for (const f of fixtures) {
  const out = escapeHtml(f.input);
  const okContain = f.mustContain.every((s) => out.includes(s));
  const okNot = f.mustNotContain.every((s) => !out.includes(s));
  if (!okContain || !okNot) {
    failed += 1;
    console.error(`FAIL ${f.name}: got ${JSON.stringify(out)}`);
  } else {
    console.log(`OK ${f.name}`);
  }
}

// Sanity: escaped product name is inert when parsed as HTML text content.
const productName = `<img src=x onerror=alert('pwn')>Evil Product`;
const escaped = escapeHtml(productName);
if (escaped.includes('<') || escaped.includes('>')) {
  failed += 1;
  console.error('FAIL product name still has raw angle brackets');
} else {
  console.log('OK product name XSS inert');
}

if (failed) {
  console.error(`\n${failed} fixture(s) failed`);
  process.exit(1);
}
console.log('\nAll XSS escape fixtures passed.');
