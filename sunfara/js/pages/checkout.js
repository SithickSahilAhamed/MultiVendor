/* ================================================
   checkout.js — Multi-step Checkout Page
   Steps: 1) Address → 2) Payment → 3) Success
   Route: #/checkout (guard: requires login)
   ================================================ */
const CheckoutPage = {
  step: 1,
  selectedAddress: null,
  paymentMethod: null,
  newAddress: {},

  render() {
    if (!Store.user) { Toast.show('Please login to continue', 'error'); window.location.hash = '#/login'; return; }
    if (!Store.cart.length) { window.location.hash = '#/cart'; return; }

    this.step = 1;
    this.selectedAddress = Store.user.addresses[0] || null;

    const t = Store.getCartTotal();
    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <h2 style="margin-bottom:var(--space-6)">Checkout</h2>
        <div class="checkout-layout">
          <div class="checkout-main">
            <div class="step-indicator" id="step-indicator"></div>
            <div id="step-content"></div>
          </div>
          <div class="checkout-summary">
            <h3 style="font-size:var(--text-sm);letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:var(--space-4)">Order Summary</h3>
            ${Store.cart.map(item => `
              <div class="checkout-item-mini">
                <img class="checkout-item-img" src="${item.image}" alt="${item.name}" onerror="this.style.background='var(--color-cream)'">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.8rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</div>
                  <div style="font-size:.75rem;color:var(--color-text-muted)">${item.variantName} · Qty ${item.quantity}</div>
                </div>
                <div style="font-weight:700;font-size:.85rem">${formatPrice(item.price * item.quantity)}</div>
              </div>`).join('')}
            <hr class="divider">
            <div class="summary-row"><span>Subtotal</span><span>${formatPrice(t.price)}</span></div>
            <div class="summary-row"><span>Discount</span><span style="color:var(--color-primary)">-${formatPrice(t.discount)}</span></div>
            <div class="summary-row"><span>Delivery</span><span>${t.delivery===0?'FREE':formatPrice(t.delivery)}</span></div>
            <hr class="divider">
            <div class="summary-row total"><span>Total</span><span>${formatPrice(t.final)}</span></div>
            <div style="font-size:.75rem;color:var(--color-text-muted);text-align:center;margin-top:var(--space-3)">🔒 Safe & Secure · SSL Encrypted</div>
          </div>
        </div>
      </div>`;

    this.renderStep();
  },

  renderStepIndicator() {
    const el = document.getElementById('step-indicator');
    if (!el) return;
    el.innerHTML = `
      <div class="step ${this.step >= 1 ? 'active' : ''} ${this.step > 1 ? 'done' : ''}">
        <div class="step-circle">${this.step > 1 ? '✓' : '1'}</div>
        <div class="step-label">Address</div>
      </div>
      <div class="step-line ${this.step > 1 ? 'done' : ''}"></div>
      <div class="step ${this.step >= 2 ? 'active' : ''} ${this.step > 2 ? 'done' : ''}">
        <div class="step-circle">${this.step > 2 ? '✓' : '2'}</div>
        <div class="step-label">Payment</div>
      </div>
      <div class="step-line ${this.step > 2 ? 'done' : ''}"></div>
      <div class="step ${this.step >= 3 ? 'active' : ''}">
        <div class="step-circle">3</div>
        <div class="step-label">Done</div>
      </div>`;
  },

  renderStep() {
    this.renderStepIndicator();
    const el = document.getElementById('step-content');
    if (!el) return;
    if (this.step === 1) this.renderAddressStep(el);
    else if (this.step === 2) this.renderPaymentStep(el);
    else this.renderSuccessStep(el);
  },

  renderAddressStep(el) {
    const addresses = Store.user.addresses;
    el.innerHTML = `
      <h3 style="margin-bottom:var(--space-4)">Select Delivery Address</h3>
      <div class="saved-addresses">
        ${addresses.map(a => `
          <div class="address-card ${this.selectedAddress?.id===a.id?'selected':''}" onclick="CheckoutPage.selectedAddress=Store.user.addresses.find(x=>x.id==='${a.id}');document.querySelectorAll('.address-card').forEach(c=>c.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" class="address-card-radio" name="address" ${this.selectedAddress?.id===a.id?'checked':''}>
            <div><div class="address-type-badge">🏠 ${a.type||'Home'}</div><div class="address-text"><strong>${a.name}</strong> · ${a.phone}<br>${a.line1}${a.line2?', '+a.line2:''}<br>${a.city}, ${a.state} — ${a.pincode}</div></div>
          </div>`).join('')}
        <div class="add-address-toggle" onclick="document.getElementById('add-addr-form').classList.toggle('visible')">
          ＋ Add New Address
        </div>
        <div class="address-form" id="add-addr-form">
          <div class="input-row">
            <div class="input-group"><label class="input-label">Full Name <span class="required">*</span></label><input class="input" id="addr-name" placeholder="Full Name"></div>
            <div class="input-group"><label class="input-label">Phone <span class="required">*</span></label><input class="input" id="addr-phone" placeholder="10-digit mobile" maxlength="10" type="tel"></div>
          </div>
          <div class="input-row">
            <div class="input-group"><label class="input-label">Pincode <span class="required">*</span></label><input class="input" id="addr-pin" placeholder="6-digit pincode" maxlength="6" type="number"></div>
            <div class="input-group"><label class="input-label">City <span class="required">*</span></label><input class="input" id="addr-city" placeholder="City"></div>
          </div>
          <div class="input-group"><label class="input-label">Address Line 1 <span class="required">*</span></label><input class="input" id="addr-line1" placeholder="House/Flat no, Street"></div>
          <div class="input-group"><label class="input-label">Address Line 2</label><input class="input" id="addr-line2" placeholder="Landmark (optional)"></div>
          <div class="input-group"><label class="input-label">State <span class="required">*</span></label>
            <select class="input" id="addr-state">
              <option value="">Select State</option>
              ${['Andhra Pradesh','Delhi','Gujarat','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'].map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="address-type-options">
            ${['Home','Work','Other'].map(t=>`<div class="address-type-option" onclick="document.querySelectorAll('.address-type-option').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');CheckoutPage.newAddress.type='${t}'">${t==='Home'?'🏠':t==='Work'?'🏢':'📍'} ${t}</div>`).join('')}
          </div>
          <button class="btn btn-primary" style="margin-top:var(--space-4)" onclick="CheckoutPage.saveAddress()">Save & Use This Address</button>
        </div>
      </div>
      ${addresses.length || this.selectedAddress ? `<button class="btn btn-primary btn-full btn-lg" style="margin-top:var(--space-6)" onclick="CheckoutPage.goToPayment()">Use This Address & Continue →</button>` : ''}`;
  },

  saveAddress() {
    const name = document.getElementById('addr-name')?.value.trim();
    const phone = document.getElementById('addr-phone')?.value.trim();
    const pin = document.getElementById('addr-pin')?.value.trim();
    const city = document.getElementById('addr-city')?.value.trim();
    const line1 = document.getElementById('addr-line1')?.value.trim();
    const state = document.getElementById('addr-state')?.value;
    const errors = [];
    if (!name || name.length < 2) errors.push('Name must be at least 2 characters');
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) errors.push('Enter a valid 10-digit mobile number');
    if (!pin || pin.length !== 6) errors.push('Enter a valid 6-digit pincode');
    if (!city) errors.push('City is required');
    if (!line1) errors.push('Address Line 1 is required');
    if (!state) errors.push('Please select a state');
    if (errors.length) { Toast.show(errors[0], 'error'); return; }

    const address = { name, phone, pincode: pin, city, line1, line2: document.getElementById('addr-line2')?.value.trim(), state, type: this.newAddress.type || 'Home' };
    Store.addAddress(address);
    this.selectedAddress = Store.user.addresses[Store.user.addresses.length - 1];
    Toast.show('Address saved!', 'success');
    this.renderAddressStep(document.getElementById('step-content'));
  },

  goToPayment() {
    if (!this.selectedAddress && !Store.user.addresses.length) { Toast.show('Please add a delivery address', 'error'); return; }
    if (!this.selectedAddress) this.selectedAddress = Store.user.addresses[0];
    this.step = 2;
    this.renderStep();
  },

  renderPaymentStep(el) {
    this.paymentMethod = 'upi';
    el.innerHTML = `
      <h3 style="margin-bottom:var(--space-4)">Choose Payment Method</h3>
      <div class="payment-options">
        ${[
          { id: 'upi', icon: '📱', label: 'UPI', sub: 'PhonePe, GPay, Paytm & more', fields: `<input class="input" placeholder="Enter UPI ID (yourname@upi)" style="margin-bottom:8px">` },
          { id: 'card', icon: '💳', label: 'Credit / Debit Card', sub: 'All major cards accepted', fields: `<input class="input card-number-input" placeholder="Card Number" maxlength="19" style="margin-bottom:8px"><input class="input" placeholder="Name on Card" style="margin-bottom:8px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="input" placeholder="MM/YY"><input class="input" placeholder="CVV" maxlength="3" type="password"></div><label style="display:flex;align-items:center;gap:8px;font-size:.8rem;margin-top:8px"><input type="checkbox"> Save card for faster checkout</label>` },
          { id: 'netbanking', icon: '🏦', label: 'Net Banking', sub: 'SBI, HDFC, ICICI, Axis & more', fields: `<select class="input"><option>Select Bank</option>${['SBI','HDFC','ICICI','Axis','Kotak','PNB'].map(b=>`<option>${b}</option>`).join('')}</select>` },
          { id: 'cod', icon: '💵', label: 'Cash on Delivery', sub: '₹40 additional COD charge · Pay at doorstep', fields: `<p style="font-size:.85rem;color:var(--color-text-muted)">A nominal ₹40 fee is charged for COD orders.</p>` }
        ].map(pm => `
          <div class="payment-card ${pm.id==='upi'?'selected':''}" id="pm-${pm.id}" onclick="CheckoutPage.selectPayment('${pm.id}')">
            <div class="payment-header">
              <input type="radio" name="payment" ${pm.id==='upi'?'checked':''}>
              <span class="payment-icon">${pm.icon}</span>
              <div><div class="payment-label">${pm.label}</div><div class="payment-sub">${pm.sub}</div></div>
            </div>
            <div class="payment-fields">${pm.fields}</div>
          </div>`).join('')}
      </div>
      <button class="btn btn-primary btn-full btn-lg" style="margin-top:var(--space-6)" onclick="CheckoutPage.placeOrder()">Place Order 🌿</button>`;
  },

  selectPayment(method) {
    this.paymentMethod = method;
    document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`pm-${method}`)?.classList.add('selected');
    document.querySelectorAll('input[name="payment"]').forEach(r => r.checked = r.closest('.payment-card')?.id === `pm-${method}`);
  },

  async placeOrder() {
    const methodLabels = { upi: 'UPI', card: 'Card', netbanking: 'Net Banking', cod: 'Cash on Delivery' };
    const paymentLabel = methodLabels[this.paymentMethod] || 'UPI';
    const btn = document.querySelector('#step-content .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

    try {
      const items = Store.cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
      const order = await SunfaraAPI.post('/checkout', { items, shippingAddress: this.selectedAddress, paymentMethod: paymentLabel });
      const orderId = order.id;

      if (this.paymentMethod !== 'cod') {
        await this.payWithRazorpay(orderId);
      }

      Store.placeOrder({ orderId, address: this.selectedAddress, payment: paymentLabel });
      this.step = 3;
      this.orderId = orderId;
      this.renderStep();
      Navbar.updateBadges();
    } catch (err) {
      Toast.show(err.message || 'Could not place order. Please try again.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order 🌿'; }
    }
  },

  /* Opens Razorpay Checkout for an already-created backend order and resolves
     once the payment is verified server-side. Rejects on cancel/failure. */
  payWithRazorpay(orderId) {
    return new Promise((resolve, reject) => {
      SunfaraAPI.post('/payments/create-order', { orderId }).then(razorpayOrder => {
        const rzp = new Razorpay({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          order_id: razorpayOrder.razorpayOrderId,
          name: 'Sunfara',
          description: 'Order payment',
          prefill: { name: Store.user.name, email: Store.user.email, contact: Store.user.phone },
          theme: { color: '#4a7c59' },
          handler: (response) => {
            SunfaraAPI.post('/payments/verify', {
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            }).then(resolve).catch(() => reject(new Error(`Payment verification failed. If money was deducted, contact support with order ${orderId}.`)));
          },
          modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) }
        });
        rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed. Please try again.')));
        rzp.open();
      }).catch(err => reject(new Error(err.message || 'Could not start payment.')));
    });
  },

  renderSuccessStep(el) {
    el.innerHTML = `
      <div class="order-success">
        <div class="success-icon">
          <svg class="checkmark-svg" viewBox="0 0 52 52">
            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark-tick" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
        <h2 style="color:var(--color-primary)">Order Placed Successfully! 🌿</h2>
        <p style="color:var(--color-text-secondary)">Thank you, ${Store.user.name.split(' ')[0]}! Your organic goodies are on their way.</p>
        <div class="success-card">
          <div class="success-order-id">Order ID: ${this.orderId}</div>
          <div style="font-size:.9rem;color:var(--color-text-secondary)">Estimated Delivery: <strong>${addDays(4)}</strong></div>
          <div style="font-size:.85rem;color:var(--color-text-muted);margin-top:8px">A confirmation will be sent to <strong>${Store.user.email}</strong></div>
        </div>
        <div style="display:flex;gap:var(--space-4);justify-content:center;flex-wrap:wrap">
          <a href="#/orders" class="btn btn-primary">Track My Order 📦</a>
          <a href="#/" class="btn btn-outline">Continue Shopping 🛍️</a>
        </div>
      </div>`;
  }
};
