/* Vendor Portal — Register / Login / Forgot Password */

const VendorAuthPage = {
  shell(inner) {
    document.getElementById('vendor-auth-shell').innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4a7c59 0%,#2e5c3a 100%);padding:24px">
        <div style="background:white;padding:40px;border-radius:12px;width:100%;max-width:440px;box-shadow:0 20px 25px rgba(0,0,0,0.15)">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:40px;margin-bottom:8px">🌿</div>
            <h1 style="margin:0;font-size:24px;color:#111827">Sunfara Seller Center</h1>
            <p style="color:#6b7280;margin-top:6px;font-size:14px">Sell your products on Sunfara</p>
          </div>
          ${inner}
        </div>
      </div>`;
  },

  renderLogin() {
    this.shell(`
      <div class="admin-form-group"><label class="admin-label">Email</label><input type="email" class="admin-input" id="vlogin-email" placeholder="you@example.com" /></div>
      <div class="admin-form-group"><label class="admin-label">Password</label><input type="password" class="admin-input" id="vlogin-password" placeholder="Password" /></div>
      <button class="admin-btn admin-btn-primary" style="width:100%;padding:12px;margin-top:8px" id="vlogin-btn" onclick="VendorAuthPage.login()">Login to Seller Center</button>
      <p style="text-align:center;margin-top:16px;font-size:13px"><a href="#/vendor/forgot-password" style="color:#4a7c59">Forgot password?</a></p>
      <p style="text-align:center;margin-top:8px;font-size:13px;color:#6b7280">New seller? <a href="#/vendor/register" style="color:#4a7c59;font-weight:600">Create your seller account →</a></p>
    `);
  },

  async login() {
    const email = document.getElementById('vlogin-email')?.value.trim();
    const password = document.getElementById('vlogin-password')?.value;
    if (!VendorUtils.validateEmail(email)) { VendorToast.error('Enter a valid email'); return; }
    if (!password) { VendorToast.error('Enter your password'); return; }
    const btn = document.getElementById('vlogin-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }
    try {
      await VendorStore.login(email, password);
      VendorToast.success(`Welcome back, ${VendorStore.user.name}! 🌿`);
      window.location.hash = '#/vendor/dashboard';
      VendorRouter.resolve();
    } catch (err) {
      VendorToast.error(this.authErrorMessage(err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Login to Seller Center'; }
    }
  },

  renderForgotPassword() {
    this.shell(`
      <div class="admin-form-group"><label class="admin-label">Email</label><input type="email" class="admin-input" id="vforgot-email" placeholder="you@example.com" /></div>
      <button class="admin-btn admin-btn-primary" style="width:100%;padding:12px;margin-top:8px" onclick="VendorAuthPage.forgotPassword()">Send Reset Link</button>
      <p style="text-align:center;margin-top:16px;font-size:13px"><a href="#/vendor/login" style="color:#4a7c59">← Back to login</a></p>
    `);
  },

  async forgotPassword() {
    const email = document.getElementById('vforgot-email')?.value.trim();
    if (!VendorUtils.validateEmail(email)) { VendorToast.error('Enter a valid email'); return; }
    try {
      await window.FirebaseAuth.sendPasswordResetEmail(window.firebase.auth, email);
      VendorToast.success(`Reset link sent to ${email}`);
    } catch (err) {
      VendorToast.error(this.authErrorMessage(err));
    }
  },

  renderRegister() {
    this.shell(`
      <div class="admin-form-group"><label class="admin-label">Business / Store Name *</label><input type="text" class="admin-input" id="vreg-name" placeholder="e.g. Haaniya Organics" /></div>
      <div class="admin-form-group"><label class="admin-label">Email *</label><input type="email" class="admin-input" id="vreg-email" placeholder="you@example.com" /></div>
      <div class="admin-form-group"><label class="admin-label">Phone *</label><input type="text" class="admin-input" id="vreg-phone" placeholder="10-digit mobile" maxlength="10" /></div>
      <div class="admin-form-group"><label class="admin-label">Password *</label><input type="password" class="admin-input" id="vreg-password" placeholder="Min 8 characters" /></div>
      <button class="admin-btn admin-btn-primary" style="width:100%;padding:12px;margin-top:8px" id="vreg-btn" onclick="VendorAuthPage.register()">Create Seller Account 🌿</button>
      <p style="text-align:center;margin-top:16px;font-size:13px;color:#6b7280">Already selling with us? <a href="#/vendor/login" style="color:#4a7c59;font-weight:600">Login →</a></p>
    `);
  },

  async register() {
    const name = document.getElementById('vreg-name')?.value.trim();
    const email = document.getElementById('vreg-email')?.value.trim();
    const phone = document.getElementById('vreg-phone')?.value.trim();
    const password = document.getElementById('vreg-password')?.value;

    if (!name || name.length < 2) { VendorToast.error('Business name must be at least 2 characters'); return; }
    if (!VendorUtils.validateEmail(email)) { VendorToast.error('Enter a valid email'); return; }
    if (!VendorUtils.validatePhone(phone)) { VendorToast.error('Enter a valid 10-digit mobile number'); return; }
    if (!password || password.length < 8) { VendorToast.error('Password must be at least 8 characters'); return; }

    const btn = document.getElementById('vreg-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
    try {
      await VendorAPI.register({ name, email, phone, password });
      await VendorStore.login(email, password);
      VendorToast.success('Seller account created! Pending admin approval.', 'success');
      window.location.hash = '#/vendor/dashboard';
      VendorRouter.resolve();
    } catch (err) {
      VendorToast.error(err.message || 'Could not create account');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Seller Account 🌿'; }
    }
  },

  authErrorMessage(err) {
    const map = {
      'auth/user-not-found': 'No seller account found with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.'
    };
    return map[err?.code] || err?.message || 'Something went wrong. Please try again.';
  }
};
