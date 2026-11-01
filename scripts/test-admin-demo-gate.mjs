#!/usr/bin/env node
/* CAT-003: exercise allowDemoFallbacks / sync getters without a browser DOM. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'sunfara/js/admin/admin-store.js'), 'utf8');

function loadStore({ hostname, allowDemo }) {
  const sandbox = {
    console,
    location: { hostname },
    window: { SUNFARA_ALLOW_ADMIN_DEMO: allowDemo },
    AdminUtils: {
      getItem: () => null,
      setItem() {},
      removeItem() {}
    },
    AdminAPI: {
      init() {},
      setToken() {},
      getVendors: async () => { throw new Error('API down'); },
      getProducts: async () => { throw new Error('API down'); },
      getOrders: async () => { throw new Error('API down'); },
      getCustomers: async () => { throw new Error('API down'); },
      getCommissions: async () => [],
      getWithdrawals: async () => [],
      getReturns: async () => [],
      getRefunds: async () => [],
      updateVendor: async () => {},
      updateProduct: async () => {}
    },
    setInterval() {},
    module: undefined,
    exports: undefined
  };
  vm.createContext(sandbox);
  // Classic browser scripts expose AdminStore as a lexical global; bridge it onto the sandbox.
  vm.runInContext(source + '\nthis.AdminStore = AdminStore;', sandbox);
  return sandbox.AdminStore;
}

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

const prod = loadStore({ hostname: 'sunfara.com', allowDemo: undefined });
assert(prod.allowDemoFallbacks() === false, 'production hostname disables demos');
assert(prod.getVendors().length === 0, 'prod sync getVendors returns [] not demo');
const prodVendors = await prod.fetchVendors();
assert(prodVendors.length === 0, 'prod fetchVendors on API error returns []');
assert(!!prod.lastError, 'prod surfaces lastError on API failure');

const local = loadStore({ hostname: 'localhost', allowDemo: undefined });
assert(local.allowDemoFallbacks() === true, 'localhost may use demos');
const localVendors = await local.fetchVendors();
assert(localVendors.length > 0, 'localhost fetchVendors falls back to demo on error');

const forced = loadStore({ hostname: 'sunfara.com', allowDemo: true });
assert(forced.allowDemoFallbacks() === true, 'explicit SUNFARA_ALLOW_ADMIN_DEMO opt-in works');

console.log(`\nCAT-003 admin demo gate tests: ${passed} assertions passed`);
