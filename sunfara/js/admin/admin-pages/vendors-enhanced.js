/* Enhanced Vendors Page with Detail Page, KYC, Documents & Communication */

const AdminVendorsEnhanced = {
  currentVendor: null,

  render: function() {
    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Vendors', route: '#/admin/vendors' }
    ]);

    const vendors = AdminStore.getVendors();
    const pending = vendors.filter(v => v.status === 'pending').length;

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Vendor Management</h1>
          <p class="admin-page-subtitle">Manage vendors, KYC verification, documents (${vendors.length} total, ${pending} pending)</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary">📊 Export</button>
          <button class="admin-btn admin-btn-primary" onclick="AdminVendorsEnhanced.showAddVendorModal()">➕ Add Vendor</button>
        </div>
      </div>

      ${pending > 0 ? `
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; gap: 16px;">
        <span style="font-size: 24px;">🔔</span>
        <div>
          <strong style="color: #7f1d1d;">KYC Verification Pending</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9f1239;">${pending} vendor(s) awaiting KYC verification</p>
        </div>
      </div>
      ` : ''}

      <div class="admin-table-wrapper">
        <div class="admin-table-toolbar">
          <input type="text" class="admin-input" placeholder="Search vendors..." style="max-width: 250px;" />
          <select class="admin-select" style="max-width: 150px;">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending KYC</option>
            <option>Suspended</option>
          </select>
          <select class="admin-select" style="max-width: 150px;">
            <option>All Ratings</option>
            <option>5 Stars</option>
            <option>4+ Stars</option>
            <option>3+ Stars</option>
          </select>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Vendor</th>
              <th>Status</th>
              <th>KYC Status</th>
              <th>Products</th>
              <th>Revenue</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(v => `
              <tr style="cursor: pointer;">
                <td><input type="checkbox" /></td>
                <td onclick="AdminVendorsEnhanced.showDetailPage('${v.id}')" style="font-weight: 600; color: #22c55e;">${v.logo} ${v.name}</td>
                <td><span class="admin-status-badge ${AdminConfig.statusColors[v.status]}">${AdminConfig.statusLabels[v.status]}</span></td>
                <td>
                  ${v.kycStatus === 'completed' ? '<span class="admin-status-badge admin-status-active">✅ Verified</span>' : 
                    v.kycStatus === 'pending' ? '<span class="admin-status-badge admin-status-pending">⏳ Pending</span>' : 
                    '<span class="admin-status-badge admin-status-rejected">❌ Rejected</span>'}
                </td>
                <td>${v.products}</td>
                <td><strong>${AdminUtils.formatPrice(v.revenue)}</strong></td>
                <td>⭐${v.rating}</td>
                <td>
                  <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="AdminVendorsEnhanced.showDetailPage('${v.id}')">View Profile</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  showDetailPage: function(vendorId) {
    const vendor = AdminStore.getVendorById(vendorId);
    this.currentVendor = vendor;

    AdminLayout.renderBreadcrumb([
      { label: 'Dashboard', route: '#/admin/dashboard' },
      { label: 'Vendors', route: '#/admin/vendors' },
      { label: vendor.name, route: '#/admin/vendors/' + vendorId }
    ]);

    const html = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${vendor.logo} ${vendor.name}</h1>
          <p class="admin-page-subtitle">Complete vendor profile and management</p>
        </div>
        <div class="admin-page-actions">
          <button class="admin-btn admin-btn-secondary" onclick="AdminVendorsEnhanced.render()">← Back to List</button>
          ${vendor.status === 'pending' ? `<button class="admin-btn admin-btn-primary" onclick="AdminVendorsEnhanced.approveVendor('${vendor.id}')">✅ Approve Vendor</button>` : ''}
        </div>
      </div>

      <div class="admin-grid-2">
        <!-- Vendor Profile Card -->
        <div class="admin-card">
          <div class="admin-card-header">Vendor Information</div>
          <div class="admin-card-body">
            <div style="display: grid; gap: 16px;">
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Name</div>
                <div style="font-weight: 600; margin-top: 4px;">${vendor.name}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</div>
                <div style="margin-top: 4px;"><a href="mailto:${vendor.email}" style="color: #22c55e; text-decoration: none;">${vendor.email}</a></div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Phone</div>
                <div style="margin-top: 4px;"><a href="tel:${vendor.phone}" style="color: #22c55e; text-decoration: none;">${vendor.phone}</a></div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Status</div>
                <div style="margin-top: 4px;"><span class="admin-status-badge ${AdminConfig.statusColors[vendor.status]}">${AdminConfig.statusLabels[vendor.status]}</span></div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Commission Rate</div>
                <div style="font-weight: 600; margin-top: 4px; font-size: 18px; color: #22c55e;">${vendor.commission}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- KYC Status Card -->
        <div class="admin-card">
          <div class="admin-card-header">KYC Verification</div>
          <div class="admin-card-body">
            <div style="display: grid; gap: 12px;">
              <div style="padding: 12px; background: ${vendor.kycStatus === 'completed' ? '#dcfce7' : vendor.kycStatus === 'pending' ? '#fef3c7' : '#fee2e2'}; border-radius: 8px; border-left: 4px solid ${vendor.kycStatus === 'completed' ? '#10b981' : vendor.kycStatus === 'pending' ? '#f59e0b' : '#ef4444'};">
                <div style="font-weight: 600; margin-bottom: 4px;">
                  ${vendor.kycStatus === 'completed' ? '✅ KYC Verified' : vendor.kycStatus === 'pending' ? '⏳ Pending Review' : '❌ Rejected'}
                </div>
                <div style="font-size: 12px;">
                  ${vendor.kycStatus === 'completed' ? 'All documents verified and approved' : vendor.kycStatus === 'pending' ? 'Awaiting document verification' : 'Documents rejected, resubmission required'}
                </div>
              </div>
              <button class="admin-btn admin-btn-secondary" style="width: 100%;" onclick="AdminVendorsEnhanced.showKYCWorkflow('${vendor.id}')">📋 View KYC Checklist</button>
              <button class="admin-btn admin-btn-secondary" style="width: 100%;" onclick="AdminVendorsEnhanced.showDocumentManager('${vendor.id}')">📄 Manage Documents</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="admin-grid" style="margin-top: 24px;">
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Products Listed</div>
          <div class="admin-kpi-value">${vendor.products}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Active products in catalog</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Total Revenue</div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(vendor.revenue)}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">All time sales</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Rating</div>
          <div class="admin-kpi-value">⭐${vendor.rating}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">${vendor.reviews} customer reviews</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-label">Commission Earned</div>
          <div class="admin-kpi-value">${AdminUtils.formatPrice(vendor.revenue * vendor.commission / 100)}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Commission from sales</div>
        </div>
      </div>

      <!-- Communication Section -->
      <div class="admin-card" style="margin-top: 24px;">
        <div class="admin-card-header">Vendor Communication</div>
        <div class="admin-card-body">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; max-height: 250px; overflow-y: auto;">
            <div style="display: grid; gap: 12px; font-size: 13px;">
              <div style="padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #22c55e;">
                <div style="font-weight: 600;">✅ Vendor Approved</div>
                <div style="color: #6b7280; margin-top: 4px;">March 15, 2024 - 2:30 PM</div>
              </div>
              <div style="padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #0ea5e9;">
                <div style="font-weight: 600;">📧 Document Request Sent</div>
                <div style="color: #6b7280; margin-top: 4px;">March 10, 2024 - Please submit PAN certificate</div>
              </div>
              <div style="padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <div style="font-weight: 600;">⏳ Awaiting GST Certificate</div>
                <div style="color: #6b7280; margin-top: 4px;">March 5, 2024 - Pending document submission</div>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
            <input type="text" class="admin-input" placeholder="Send message to vendor..." />
            <button class="admin-btn admin-btn-primary" onclick="AdminVendorsEnhanced.sendMessage('${vendor.id}')">Send</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-page-content').innerHTML = html;
  },

  showKYCWorkflow: function(vendorId) {
    const vendor = AdminStore.getVendorById(vendorId);
    
    const kycChecklist = `
      <div style="display: grid; gap: 12px;">
        <div style="padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #10b981;">
          <div>✅ <strong>Business Registration</strong></div>
          <div style="font-size: 12px; color: #065f46; margin-top: 4px;">Verified - March 10, 2024</div>
        </div>
        <div style="padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #10b981;">
          <div>✅ <strong>GST Certificate</strong></div>
          <div style="font-size: 12px; color: #065f46; margin-top: 4px;">Verified - March 12, 2024</div>
        </div>
        <div style="padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #10b981;">
          <div>✅ <strong>PAN Card</strong></div>
          <div style="font-size: 12px; color: #065f46; margin-top: 4px;">Verified - March 15, 2024</div>
        </div>
        <div style="padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #10b981;">
          <div>✅ <strong>Bank Account Verification</strong></div>
          <div style="font-size: 12px; color: #065f46; margin-top: 4px;">Verified - March 16, 2024</div>
        </div>
        <div style="padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #10b981;">
          <div>✅ <strong>Address Verification</strong></div>
          <div style="font-size: 12px; color: #065f46; margin-top: 4px;">Verified - March 18, 2024</div>
        </div>
      </div>
    `;

    AdminModal.show(vendor.name + ' - KYC Verification Checklist', kycChecklist, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  },

  showDocumentManager: function(vendorId) {
    const vendor = AdminStore.getVendorById(vendorId);
    
    const documents = `
      <div style="display: grid; gap: 12px;">
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">📄 GST Certificate</div>
            <div style="font-size: 12px; color: #6b7280;">Document_GST_${vendor.id}.pdf</div>
          </div>
          <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminVendorsEnhanced.viewDocument('gst')">View</button>
        </div>
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">🪪 PAN Card</div>
            <div style="font-size: 12px; color: #6b7280;">Document_PAN_${vendor.id}.pdf</div>
          </div>
          <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminVendorsEnhanced.viewDocument('pan')">View</button>
        </div>
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">🏦 Bank Statement</div>
            <div style="font-size: 12px; color: #6b7280;">Document_Bank_${vendor.id}.pdf</div>
          </div>
          <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminVendorsEnhanced.viewDocument('bank')">View</button>
        </div>
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">📸 Store Photos</div>
            <div style="font-size: 12px; color: #6b7280;">4 images uploaded</div>
          </div>
          <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="AdminVendorsEnhanced.viewDocuments('photos')">View</button>
        </div>
      </div>
    `;

    AdminModal.show(vendor.name + ' - Document Management', documents, [
      { label: 'Close', class: 'admin-btn-secondary', onclick: 'AdminModal.close()' }
    ]);
  },

  showAddVendorModal: function() {
    AdminToast.info('Add new vendor form opened');
  },

  approveVendor: function(vendorId) {
    AdminStore.updateVendor(vendorId, { status: 'active', kycStatus: 'completed' });
    AdminToast.success('Vendor approved successfully!');
    setTimeout(() => this.render(), 500);
  },

  sendMessage: function(vendorId) {
    AdminToast.success('Message sent to vendor!');
  },

  viewDocument: function(docType) {
    AdminToast.info('Opening ' + docType + ' document...');
  }
};

AdminVendors = AdminVendorsEnhanced;
