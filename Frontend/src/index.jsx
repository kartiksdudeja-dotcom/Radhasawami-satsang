import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ==============================
// ✅ SERVICE WORKER + SUBSCRIPTION
// ==============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register SW
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ SW registered');

      // Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        return;
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "YOUR_VAPID_PUBLIC_KEY"
      });

      console.log('📡 Subscription:', subscription);

      // Send to backend
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('✅ Subscription saved');

    } catch (err) {
      console.error('❌ Error:', err);
    }
  });
}