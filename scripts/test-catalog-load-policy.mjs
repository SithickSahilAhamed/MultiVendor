#!/usr/bin/env node
/* CAT-002 unit checks for catalog-load-policy.js (no browser). */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = require(path.join(root, 'sunfara/js/catalog-load-policy.js'));

let passed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log('ok:', msg);
}

assert(policy.classifyApiResult({ ok: true, body: [] }) === 'api-empty', 'empty success → api-empty');
assert(policy.classifyApiResult({ ok: true, body: [{ id: 1 }] }) === 'api', 'non-empty success → api');
assert(policy.classifyApiResult({ ok: false, error: new Error('net') }) === 'transport-failure', 'throw/network → transport-failure');
assert(policy.shouldUseJsonFallback('api-empty') === false, 'no JSON fallback on empty success');
assert(policy.shouldUseJsonFallback('api') === false, 'no JSON fallback on API success');
assert(policy.shouldUseJsonFallback('transport-failure') === true, 'JSON fallback only on transport failure');

const emptyOk = policy.resolveCollection({ ok: true, body: [] }, [{ id: 'DEMO' }]);
assert(emptyOk.items.length === 0 && emptyOk.source === 'api-empty' && emptyOk.usedFallback === false,
  'empty success never mixes demo JSON');

const failed = policy.resolveCollection({ ok: false }, [{ id: 'DEMO' }]);
assert(failed.items.length === 1 && failed.source === 'json-fallback' && failed.usedFallback === true,
  'transport failure may use JSON fallback');

const failedNoJson = policy.resolveCollection({ ok: false }, []);
assert(failedNoJson.items.length === 0 && failedNoJson.source === 'api-error-empty',
  'transport failure with no JSON → api-error-empty');

console.log(`\nCAT-002 policy tests: ${passed} assertions passed`);
