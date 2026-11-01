/* Admin Panel Initialization */

document.addEventListener('DOMContentLoaded', function() {
  // Init admin panel
  AdminLayout.init();
  AdminRouter.init();

  // Set page title
  document.title = 'Sunfara Admin Panel';

  console.log('Admin Panel Initialized');
});
