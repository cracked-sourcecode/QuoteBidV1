// QuoteBid Push Notification Service Worker

console.log('🔔 QuoteBid Push Service Worker loaded');

// Handle push notifications
self.addEventListener("push", event => {
  console.log('📱 Push notification received:', event);
  
  try {
    const data = event.data ? event.data.json() : {};
    console.log('📱 Push data:', data);
    
    const title = data.title || 'QuoteBid Alert';
    const options = {
      body: data.body || 'New update available',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-72.png',
      tag: 'quotebid-notification',
      data: { 
        url: data.url || '/',
        timestamp: data.timestamp || Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Opportunity',
          icon: '/icon-32.png'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('✅ Notification displayed successfully');
        })
        .catch((error) => {
          console.error('❌ Error displaying notification:', error);
        })
    );
  } catch (error) {
    console.error('❌ Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('QuoteBid Alert', {
        body: 'New update available',
        icon: '/icon-192.png',
        data: { url: '/' }
      })
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", event => {
  console.log('🖱️ Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const url = event.notification.data?.url || '/';
  
  if (action === 'close') {
    // Just close the notification
    return;
  }
  
  // Default action or 'view' action - open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a QuoteBid window/tab open
        for (const client of clientList) {
          if (client.url.includes('quotebid') && 'focus' in client) {
            // Focus existing tab and navigate to the URL
            client.focus();
            client.postMessage({ 
              type: 'NAVIGATE_TO', 
              url: url 
            });
            return;
          }
        }
        
        // No existing tab found, open a new one
        if (clients.openWindow) {
          const fullUrl = url.startsWith('http') ? url : `${self.location.origin}${url}`;
          return clients.openWindow(fullUrl);
        }
      })
      .catch(error => {
        console.error('❌ Error handling notification click:', error);
      })
  );
});

// Handle background sync (future enhancement)
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'quotebid-sync') {
    event.waitUntil(
      // Could sync missed notifications or app data
      Promise.resolve()
    );
  }
});

// Clean up old notifications
self.addEventListener('notificationclose', event => {
  console.log('❌ Notification closed:', event.notification.tag);
  
  // Track notification dismissal analytics here if needed
});

console.log('✅ QuoteBid Push Service Worker ready'); 