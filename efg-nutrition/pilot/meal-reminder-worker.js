self.addEventListener('push', (event) => {
 let message;
 try { message = event.data?.json(); } catch { return; }
 if (message?.kind !== 'meal-reminder') return;

 event.waitUntil(self.registration.showNotification('Nutrición Con-Ciencia', {
  body: '¿Ya comiste? Registralo en Mi Día.',
  tag: 'ncc-meal-reminder-' + message.deliveryKey,
  data: { meal: message.meal },
 }));
});

self.addEventListener('notificationclick', (event) => {
 event.notification.close();
 const url = new URL(self.registration.scope);
 url.searchParams.set('reminderMeal', event.notification.data?.meal ?? '');
 event.waitUntil(self.clients.openWindow(url.href));
});
