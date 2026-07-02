/* Admin Panel Initialization */

document.addEventListener('DOMContentLoaded', function() {
  // Init admin panel
  AdminLayout.init();
  AdminRouter.init();

  // Set page title
  document.title = 'Sunfara Admin Panel';

  console.log('✅ Admin Panel Initialized');
  console.log('Demo Credentials:');
  console.log('Email: admin@sunfara.com');
  console.log('Password: admin123');
});
