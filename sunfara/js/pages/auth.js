/* ================================================
   auth.js — Login & Signup Page
   Routes: #/login and #/signup
   ================================================ */
const AuthPage = {
  activeTab: 'login',

  render(params = {}) {
    if (Store.user) { window.location.hash = '#/'; return; }
    this.activeTab = params.tab || 'login';

    document.getElementById('page-content').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo"><div class="auth-logo-text">🌿 Sunfara</div><p style="font-size:.85rem;color:var(--color-text-muted)">Pure. Natural. Conscious.</p></div>
          <div class="auth-tabs">
            <button class="auth-tab ${this.activeTab==='login'?'active':''}" onclick="AuthPage.switchTab('login')">Login</button>
            <button class="auth-tab ${this.activeTab==='signup'?'active':''}" onclick="AuthPage.switchTab('signup')">Sign Up</button>
          </div>

          <!-- LOGIN -->
          <div class="auth-panel ${this.activeTab==='login'?'active':''}" id="panel-login">
            <div class="input-group"><label class="input-label">Email</label><input class="input" id="login-email" type="email" placeholder="your@email.com"></div>
            <div class="input-group">
              <div style="display:flex;justify-content:space-between"><label class="input-label">Password</label><span class="forgot-link" onclick="AuthPage.forgotPassword()">Forgot Password?</span></div>
              <div class="password-wrapper">
                <input class="input" id="login-password" type="password" placeholder="Enter your password">
                <button class="password-toggle" onclick="AuthPage.togglePwd('login-password')" aria-label="Toggle password visibility">👁</button>
              </div>
            </div>
            <button class="btn btn-primary btn-full btn-lg" id="login-submit-btn" onclick="AuthPage.login()">Login to Sunfara</button>
            <div class="auth-divider"><span>or continue with</span></div>
            <button class="social-btn" id="google-signin-btn" onclick="AuthPage.googleSignIn()"><span class="social-btn-icon">G</span> Continue with Google</button>
            <p class="auth-switch">New to Sunfara? <a onclick="AuthPage.switchTab('signup')">Sign Up →</a></p>
          </div>

          <!-- SIGNUP -->
          <div class="auth-panel ${this.activeTab==='signup'?'active':''}" id="panel-signup">
            <div class="input-group"><label class="input-label">Full Name <span class="required">*</span></label><input class="input" id="reg-name" placeholder="Your full name"></div>
            <div class="input-group"><label class="input-label">Email <span class="required">*</span></label><input class="input" id="reg-email" type="email" placeholder="your@email.com"></div>
            <div class="input-group"><label class="input-label">Phone <span class="required">*</span></label><input class="input" id="reg-phone" type="tel" placeholder="10-digit mobile number" maxlength="10"></div>
            <div class="input-group"><label class="input-label">Password <span class="required">*</span></label>
              <div class="password-wrapper"><input class="input" id="reg-password" type="password" placeholder="Min 8 chars with a number"><button class="password-toggle" onclick="AuthPage.togglePwd('reg-password')" aria-label="Toggle">👁</button></div>
            </div>
            <div class="input-group"><label class="input-label">Confirm Password <span class="required">*</span></label>
              <div class="password-wrapper"><input class="input" id="reg-confirm" type="password" placeholder="Re-enter password"><button class="password-toggle" onclick="AuthPage.togglePwd('reg-confirm')" aria-label="Toggle">👁</button></div>
            </div>
            <label class="terms-row"><input type="checkbox" id="reg-terms"> I agree to the <a href="#/about">Terms of Service</a> and <a href="#/about">Privacy Policy</a></label>
            <button class="btn btn-primary btn-full btn-lg" onclick="AuthPage.signup()">Create My Account 🌿</button>
            <p class="auth-switch">Already have an account? <a onclick="AuthPage.switchTab('login')">Login →</a></p>
          </div>
        </div>
      </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='signup')));
    document.getElementById('panel-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('panel-signup')?.classList.toggle('active', tab === 'signup');
  },

  togglePwd(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  },

  /* Maps a Firebase Auth error code to a friendly message */
  authErrorMessage(err) {
    const map = {
      'auth/user-not-found': 'No account found with that email. Try signing up instead.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/email-already-in-use': 'An account already exists with this email. Try logging in instead.',
      'auth/weak-password': 'Password is too weak. Use at least 8 characters with a number.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
      'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Please allow popups and try again.',
      'auth/operation-not-allowed': 'This sign-in method isn\'t enabled yet. Please contact support.',
      'auth/unauthorized-domain': 'This site isn\'t authorized for Google sign-in yet. Please contact support.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.'
    };
    return map[err?.code] || err?.message || 'Something went wrong. Please try again.';
  },

  /* Builds the Store.user shape from a Firebase Auth user object */
  userFromFirebase(fbUser) {
    return {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email: fbUser.email,
      phone: fbUser.phoneNumber || ''
    };
  },

  async forgotPassword() {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Enter your email above first, then click Forgot Password', 'error'); return; }
    try {
      await window.FirebaseAuth.sendPasswordResetEmail(window.firebase.auth, email);
      Toast.show(`Password reset link sent to ${email} 🌿`, 'success', 5000);
    } catch (err) {
      Toast.show(this.authErrorMessage(err), 'error');
    }
  },

  async login() {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Please enter a valid email', 'error'); return; }
    if (!password || password.length < 6) { Toast.show('Please enter your password', 'error'); return; }

    const btn = document.getElementById('login-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }
    try {
      const cred = await window.FirebaseAuth.signInWithEmailAndPassword(window.firebase.auth, email, password);
      Store.login(this.userFromFirebase(cred.user));
      Toast.show(`Welcome back to Sunfara! 🌿`, 'success');
      Navbar.render();
      window.location.hash = '#/';
    } catch (err) {
      Toast.show(this.authErrorMessage(err), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Login to Sunfara'; }
    }
  },

  async signup() {
    const name = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirm = document.getElementById('reg-confirm')?.value;
    const terms = document.getElementById('reg-terms')?.checked;

    if (!name || name.length < 2) { Toast.show('Name must be at least 2 characters', 'error'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Please enter a valid email', 'error'); return; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) { Toast.show('Please enter a valid 10-digit mobile number', 'error'); return; }
    if (!password || password.length < 8 || !/\d/.test(password)) { Toast.show('Password must be 8+ characters with at least one number', 'error'); return; }
    if (password !== confirm) { Toast.show('Passwords do not match', 'error'); return; }
    if (!terms) { Toast.show('Please accept the Terms & Privacy Policy', 'error'); return; }

    const btn = document.querySelector('#panel-signup .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
    try {
      const cred = await window.FirebaseAuth.createUserWithEmailAndPassword(window.firebase.auth, email, password);
      await window.FirebaseAuth.updateProfile(cred.user, { displayName: name });
      Store.login({ id: cred.user.uid, name, email, phone });
      Toast.show(`Welcome to Sunfara, ${name.split(' ')[0]}! 🌿`, 'success', 4000);
      Navbar.render();
      window.location.hash = '#/';
    } catch (err) {
      Toast.show(this.authErrorMessage(err), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Create My Account 🌿'; }
    }
  },

  async googleSignIn() {
    const btn = document.getElementById('google-signin-btn');
    if (btn) { btn.disabled = true; }
    try {
      const provider = new window.FirebaseAuth.GoogleAuthProvider();
      const cred = await window.FirebaseAuth.signInWithPopup(window.firebase.auth, provider);
      Store.login(this.userFromFirebase(cred.user));
      Toast.show(`Welcome to Sunfara! 🌿`, 'success');
      Navbar.render();
      window.location.hash = '#/';
    } catch (err) {
      Toast.show(this.authErrorMessage(err), 'error');
    } finally {
      if (btn) { btn.disabled = false; }
    }
  }
};
