/* ================================================
   profile.js — User Profile Page
   Route: #/profile (guard: login required)
   ================================================ */
const ProfilePage = {
  activeSection: 'profile',

  render(params = {}) {
    if (!Store.user) { window.location.hash = '#/login'; return; }
    this.activeSection = params.section || 'profile';
    const u = Store.user;

    document.getElementById('page-content').innerHTML = `
      <div class="container section">
        <div class="profile-layout">
          <!-- Sidebar -->
          <div class="profile-sidebar">
            <div class="profile-avatar-section">
              <div class="profile-avatar">${u.name.charAt(0).toUpperCase()}</div>
              <div class="profile-name">${u.name}</div>
              <div class="profile-email">${u.email}</div>
            </div>
            <nav class="profile-nav">
              <a class="profile-nav-link ${this.activeSection==='profile'?'active':''}" onclick="ProfilePage.showSection('profile')">👤 My Profile</a>
              <a class="profile-nav-link" href="#/orders">📦 My Orders</a>
              <a class="profile-nav-link" href="#/wishlist">❤️ Wishlist</a>
              <a class="profile-nav-link ${this.activeSection==='addresses'?'active':''}" onclick="ProfilePage.showSection('addresses')">📍 Saved Addresses</a>
              <a class="profile-nav-link ${this.activeSection==='notifications'?'active':''}" onclick="ProfilePage.showSection('notifications')">🔔 Notifications</a>
              <a class="profile-nav-link ${this.activeSection==='password'?'active':''}" onclick="ProfilePage.showSection('password')">🔒 Change Password</a>
              <a class="profile-nav-link logout" onclick="Store.logout();Navbar.render();Toast.show('Logged out successfully','info');window.location.hash='#/'">🚪 Logout</a>
            </nav>
          </div>
          <!-- Content -->
          <div class="profile-content" id="profile-section-content"></div>
        </div>
      </div>`;

    this.showSection(this.activeSection);
  },

  showSection(section) {
    this.activeSection = section;
    document.querySelectorAll('.profile-nav-link').forEach(l => l.classList.toggle('active', l.textContent.trim().toLowerCase().includes(section === 'profile' ? 'profile' : section === 'addresses' ? 'addresses' : section === 'notifications' ? 'notifications' : 'password')));
    const el = document.getElementById('profile-section-content');
    if (!el) return;
    const u = Store.user;

    if (section === 'profile') {
      el.innerHTML = `
        <h2 class="profile-section-title">My Profile</h2>
        <div id="profile-view">
          <div class="profile-form" style="margin-bottom:var(--space-6)">
            <div class="profile-field"><div class="profile-field-label">Full Name</div><div class="profile-field-value">${u.name}</div></div>
            <div class="profile-field"><div class="profile-field-label">Email</div><div class="profile-field-value">${u.email}</div></div>
            <div class="profile-field"><div class="profile-field-label">Phone</div><div class="profile-field-value">${u.phone || 'Not added'}</div></div>
          </div>
          <button class="btn btn-primary" onclick="ProfilePage.showEditForm()">Edit Profile</button>
        </div>
        <div id="profile-edit" style="display:none">
          <div class="profile-form">
            <div class="input-group"><label class="input-label">Full Name</label><input class="input" id="edit-name" value="${u.name}"></div>
            <div class="input-group"><label class="input-label">Email</label><input class="input" id="edit-email" type="email" value="${u.email}"></div>
            <div class="input-group full-width"><label class="input-label">Phone</label><input class="input" id="edit-phone" value="${u.phone||''}"></div>
          </div>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4)">
            <button class="btn btn-primary" onclick="ProfilePage.saveProfile()">Save Changes</button>
            <button class="btn btn-outline" onclick="ProfilePage.showSection('profile')">Cancel</button>
          </div>
        </div>`;
    } else if (section === 'addresses') {
      el.innerHTML = `
        <h2 class="profile-section-title">Saved Addresses</h2>
        <div id="address-list">
          ${u.addresses.length ? u.addresses.map(a => `
            <div class="saved-address-card" style="margin-bottom:var(--space-4)">
              ${a.isDefault ? '<span class="default-badge">Default</span>' : ''}
              <div class="address-type-badge">🏠 ${a.type||'Home'}</div>
              <div style="font-size:.9rem;margin-top:8px"><strong>${a.name}</strong> · ${a.phone}</div>
              <div style="font-size:.85rem;color:var(--color-text-secondary)">${a.line1}${a.line2?', '+a.line2:''}, ${a.city}, ${a.state} — ${a.pincode}</div>
              <div class="address-actions">
                <button class="btn btn-outline btn-sm" onclick="Toast.show('Edit address feature coming soon!','info')">Edit</button>
                <button class="btn btn-outline btn-sm" onclick="Store.removeAddress('${a.id}');ProfilePage.showSection('addresses');Toast.show('Address removed','info')" style="color:var(--color-error);border-color:var(--color-error)">Delete</button>
                ${!a.isDefault ? `<button class="btn btn-outline btn-sm" onclick="Toast.show('Set as default feature coming soon!','info')">Set as Default</button>` : ''}
              </div>
            </div>`).join('') : '<p style="color:var(--color-text-muted)">No addresses saved yet.</p>'}
        </div>
        <button class="btn btn-outline" style="margin-top:var(--space-4)" onclick="Toast.show('Add address from checkout page','info')">+ Add New Address</button>`;
    } else if (section === 'notifications') {
      el.innerHTML = `
        <h2 class="profile-section-title">Notification Preferences</h2>
        ${[
          { label: 'Order Updates', sub: 'Shipping, delivery and return notifications', checked: true },
          { label: 'Promotions & Offers', sub: 'Exclusive deals and discount codes', checked: true },
          { label: 'New Product Launches', sub: 'Be first to know about new arrivals', checked: false },
          { label: 'Blog & Wellness Tips', sub: 'Weekly skincare and wellness content', checked: false }
        ].map(n => `
          <div class="notification-row">
            <div><div style="font-weight:500">${n.label}</div><div style="font-size:.85rem;color:var(--color-text-muted)">${n.sub}</div></div>
            <label class="toggle-switch"><input type="checkbox" ${n.checked?'checked':''}><span class="toggle-slider"></span></label>
          </div>`).join('')}`;
    } else if (section === 'password') {
      el.innerHTML = `
        <h2 class="profile-section-title">Change Password</h2>
        <div style="max-width:400px;display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="input-group"><label class="input-label">Current Password</label><input class="input" type="password" id="pwd-current" placeholder="••••••••"></div>
          <div class="input-group"><label class="input-label">New Password</label><input class="input" type="password" id="pwd-new" placeholder="Min 8 chars with a number"></div>
          <div class="input-group"><label class="input-label">Confirm New Password</label><input class="input" type="password" id="pwd-confirm" placeholder="Re-enter new password"></div>
          <button class="btn btn-primary" onclick="Toast.show('Password updated successfully!','success')">Update Password</button>
        </div>`;
    }
  },

  showEditForm() {
    document.getElementById('profile-view').style.display = 'none';
    document.getElementById('profile-edit').style.display = 'block';
  },

  saveProfile() {
    const name = document.getElementById('edit-name')?.value.trim();
    const email = document.getElementById('edit-email')?.value.trim();
    const phone = document.getElementById('edit-phone')?.value.trim();
    if (!name || name.length < 2) { Toast.show('Name must be at least 2 chars', 'error'); return; }
    Store.updateProfile({ name, email, phone });
    Toast.show('Profile updated!', 'success');
    Navbar.render();
    this.render();
  }
};
