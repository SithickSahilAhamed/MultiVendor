#!/usr/bin/env node
/**
 * PAY-001 / PAY-003 static checks on sunfara checkout payment step.
 * No live Razorpay keys required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkoutPath = path.join(root, 'sunfara/js/pages/checkout.js');
const src = fs.readFileSync(checkoutPath, 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const paymentStep = src.slice(src.indexOf('renderPaymentStep'), src.indexOf('selectPayment'));

assert(!/placeholder="Card Number"/i.test(paymentStep), 'no Card Number input in payment step');
assert(!/placeholder="CVV"/i.test(paymentStep), 'no CVV input in payment step');
assert(!/placeholder="Enter UPI ID/i.test(paymentStep), 'no UPI ID input in payment step');
assert(!/card-number-input/.test(paymentStep), 'no card-number-input class');
assert(!/₹40/.test(paymentStep), 'no ₹40 COD fee claim in payment step');
assert(!/additional COD charge/i.test(paymentStep), 'no additional COD charge copy');
assert(/id: 'razorpay'/.test(paymentStep), 'razorpay payment option present');
assert(/id: 'cod'/.test(paymentStep), 'cod payment option present');
assert(!/id: 'upi'/.test(paymentStep), 'legacy upi option removed');
assert(!/id: 'card'/.test(paymentStep), 'legacy card option removed');
assert(!/id: 'netbanking'/.test(paymentStep), 'legacy netbanking option removed');
assert(/payWithRazorpay/.test(src), 'payWithRazorpay still wired');
assert(/paymentMethod === 'razorpay'/.test(src), 'online path gated on razorpay');
assert(/Razorpay Checkout|secure Razorpay/i.test(paymentStep), 'mentions Razorpay Checkout');

if (process.exitCode) {
  console.error('\nPAY-001/003 checkout payment method checks failed');
  process.exit(1);
}
console.log('\nAll PAY-001/003 checkout payment method checks passed');
