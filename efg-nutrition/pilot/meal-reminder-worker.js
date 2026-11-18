self.addEventListener('push', (event) => {
 let message;
 try { message = event.data?.json(); } catch { return; }
 if (message?.kind !== 'meal-reminder') return;

 event.waitUntil(self.registration.showNotification('Nutrición Con-Ciencia', {
  body: '¿Ya comiste? Registralo en Mi Día.',
  tag: 'ncc-meal-reminder-' + message.deliveryKey,
  data: { meal: message.meal, habitual: message.habitual },
 }));
});

self.addEventListener('notificationclick', (event) => {
 event.notification.close();
 const url = new URL(self.registration.scope);
 url.searchParams.set('reminderMeal', event.notification.data?.meal ?? '');
 if(event.notification.data?.habitual)url.searchParams.set('habitual',event.notification.data.habitual);
 event.waitUntil(self.clients.openWindow(url.href));
});
