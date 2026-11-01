/* Admin Panel Initialization (legacy root SPA — non-production) */

document.addEventListener('DOMContentLoaded', function() {
  AdminLayout.init();
  AdminRouter.init();
  document.title = 'Sunfara Admin Panel';
  console.log('Admin Panel Initialized (legacy root SPA)');
});
