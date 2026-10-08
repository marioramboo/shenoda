// Service Worker for Shenoda Church Management System
// Handles Android & Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received from server
self.addEventListener('push', (event) => {
  let data = {
    title: 'نظام خدمة الأنبا شنودة',
    body: 'لديك إشعار جديد في نظام الخدمة.',
    url: '/prep',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'shenoda-notification',
    renotify: true,
    data: {
      url: data.url || data.actionUrl || '/prep',
      payload: data.dataPayload || null,
    },
    actions: [
      { action: 'open', title: 'عرض التفاصيل' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'نظام خدمة الأنبا شنودة', options)
  );
});

// User clicked notification on Android or desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
