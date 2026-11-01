#!/usr/bin/env node
/**
 * AUTH-001 — unit checks for AdminClaimGate (no Firebase).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../sunfara/js/admin/admin-claim-gate.js'), 'utf8');
const sandbox = { module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(src + '\n;module.exports = { AdminClaimGate };', sandbox);
const { AdminClaimGate } = sandbox.module.exports;

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed++;
  console.log('ok -', msg);
}

assert(AdminClaimGate.isAdmin({ role: 'admin' }) === true, 'admin claim accepted');
assert(AdminClaimGate.isAdmin({ role: 'staff', staffPerms: 'finance' }) === true, 'staff with perms accepted');
assert(AdminClaimGate.isAdmin({ role: 'staff' }) === false, 'staff without perms rejected');
assert(AdminClaimGate.isAdmin({ role: 'vendor' }) === false, 'vendor claim rejected');
assert(AdminClaimGate.isAdmin({ role: 'customer' }) === false, 'customer/no-role rejected');
assert(AdminClaimGate.isAdmin({}) === false, 'empty claims rejected');
assert(AdminClaimGate.isAdmin(null) === false, 'null claims rejected');

let threw = false;
try { AdminClaimGate.assertAdminClaims({ role: 'vendor' }); } catch (e) {
  threw = e.code === 'auth/insufficient-admin-claim';
}
assert(threw, 'assertAdminClaims throws for non-admin');
assert(AdminClaimGate.assertAdminClaims({ role: 'admin' }) === true, 'assertAdminClaims passes for admin');
assert(AdminClaimGate.assertAdminClaims({ role: 'staff', staffPerms: 'catalog,cms' }) === true, 'assertAdminClaims passes for staff');

console.log(`\n${passed} assertions passed`);
