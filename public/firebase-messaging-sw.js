// This service worker is required for Firebase Cloud Messaging.
// It must be placed in the public directory.

// Since service workers run in a different context, we can't use process.env.
// The Firebase config is passed as URL search parameters when this worker is registered.
const params = new URL(self.location).searchParams;
const firebaseConfig = {
    apiKey: params.get("apiKey"),
    authDomain: params.get("authDomain"),
    projectId: params.get("projectId"),
    storageBucket: params.get("storageBucket"),
    messagingSenderId: params.get("messagingSenderId"),
    appId: params.get("appId"),
    measurementId: params.get("measurementId"),
};


// Only initialize if the config is not empty
if (firebaseConfig.apiKey) {
  // We need to import the scripts manually in the service worker context
  // Using the modular SDK with importScripts
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification.body || 'You have a new message.',
      icon: payload.notification.icon || '/favicon.ico',
      data: {
          url: payload.fcmOptions?.link || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.url;
    if (urlToOpen) {
       event.waitUntil(clients.openWindow(urlToOpen));
    }
  });

} else {
    console.log("Firebase config not found in service worker. Push notifications will not work in the background.");
}
