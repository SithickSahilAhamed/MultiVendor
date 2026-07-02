/* Customers Page */

const AdminCustomers = {
  _customers: [],

  render: async function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Customers', route: '#/admin/customers' }
    ]);
    document.getElementById('admin-page-content').innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">Loading customers...</div>';

    this._customers = await AdminStore.fetchCustomers();
    const customers = this._customers;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Customers</h1>
          <p class="admin-page-subtitle">${customers.length} registered customers</p>
        </div>
      </div>

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input admin-table-search" placeholder="Search customers..." style="max-width: 300px;" />
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#6b7280;">No customers found</td></tr>' :
              customers.map(c => `
              <tr>
                <td><strong>${c.name || c.displayName || '—'}</strong></td>
                <td>${c.email || '—'}</td>
                <td>${c.phone || '—'}</td>
                <td>${c.orders ?? '—'}</td>
                <td>${AdminUtils.formatPrice(c.spent || c.totalSpent || 0)}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminCustomers.viewCustomer('${c.id}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="admin-table-pagination">
          <span>Showing 1-${customers.length} of ${customers.length} customers</span>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  viewCustomer: function(id) {
    const customer = this._customers.find(c => c.id === id);
    if (!customer) return;
    const spent = customer.spent || customer.totalSpent || 0;
    const orders = customer.orders || 1;
    AdminModal.show((customer.name || customer.displayName) + ' - Customer Profile', `
      <div style="display: grid; gap: 16px;">
        <div><strong>Email:</strong> ${customer.email || '—'}</div>
        <div><strong>Phone:</strong> ${customer.phone || '—'}</div>
        <div><strong>Total Orders:</strong> ${customer.orders ?? '—'}</div>
        <div><strong>Total Spent:</strong> ${AdminUtils.formatPrice(spent)}</div>
        ${orders > 0 ? `<div><strong>Average Order Value:</strong> ${AdminUtils.formatPrice(spent / orders)}</div>` : ''}
      </div>
    `, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  }
};
