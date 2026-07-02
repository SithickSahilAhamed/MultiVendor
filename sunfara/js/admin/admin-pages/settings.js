/* Settings Page */

const AdminSettings = {
  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Settings', route: '#/admin/settings' }
    ]);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Settings</h1>
          <p class="admin-page-subtitle">Configure your marketplace</p>
        </div>
      </div>

      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-card-header">Marketplace Settings</div>
          <div class="admin-card-body">
            <div class="admin-form-group">
              <label class="admin-label">Marketplace Name</label>
              <input type="text" class="admin-input" value="Sunfara" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">Support Email</label>
              <input type="email" class="admin-input" value="support@sunfara.com" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> Vendor Approval Required
              </label>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> KYC Verification Required
              </label>
            </div>
          </div>
          <div class="admin-card-footer">
            <button class="admin-btn admin-btn-primary">Save Changes</button>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">Commission Settings</div>
          <div class="admin-card-body">
            <div class="admin-form-group">
              <label class="admin-label">Standard Commission Rate (%)</label>
              <input type="number" class="admin-input" value="8" min="1" max="30" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">Premium Commission Rate (%)</label>
              <input type="number" class="admin-input" value="5" min="1" max="30" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> Auto Reverse Commission on Refund
              </label>
            </div>
          </div>
          <div class="admin-card-footer">
            <button class="admin-btn admin-btn-primary">Save Changes</button>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">Payment Settings</div>
          <div class="admin-card-body">
            <div class="admin-form-group">
              <label class="admin-label">Payment Gateway</label>
              <select class="admin-select">
                <option>Razorpay</option>
                <option>PayU</option>
                <option>Instamojo</option>
              </select>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">Minimum Withdrawal Amount</label>
              <input type="number" class="admin-input" value="10000" />
            </div>
          </div>
          <div class="admin-card-footer">
            <button class="admin-btn admin-btn-primary">Save Changes</button>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">Notification Settings</div>
          <div class="admin-card-body">
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> New Vendor Signup
              </label>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> Refund Requests
              </label>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" checked /> Low Stock Alerts
              </label>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">
                <input type="checkbox" /> Marketing Emails
              </label>
            </div>
          </div>
          <div class="admin-card-footer">
            <button class="admin-btn admin-btn-primary">Save Preferences</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  }
};
