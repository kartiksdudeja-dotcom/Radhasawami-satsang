import webpush from "web-push";

// ======================================
// 🔐 INITIALIZE VAPID
// ======================================
export const initializePushNotifications = (
  vapidPublicKey,
  vapidPrivateKey,
  vapidEmail
) => {
  if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    console.log("✅ Web Push initialized");
  } else {
    console.warn("⚠️ Missing VAPID keys");
  }
};

// ======================================
// 📤 SEND SINGLE NOTIFICATION
// ======================================
export const sendPushNotification = async (subscription, payload) => {
  try {
    const notificationPayload = JSON.stringify({
      // 🔥 THIS FIXES MOBILE BACKGROUND ISSUE
      notification: {
        title: payload.title || "Radha Swami Portal",
        body: payload.message || payload.body || "New notification",
        icon: "/icon.png",     // ⚠️ MUST be local
        badge: "/icon.png",
        tag: payload.tag || "rs-notification",
        requireInteraction: true
      },

      // Optional data
      data: {
        url: payload.url || "/",
        type: payload.type || "general",
        ...payload.data
      }
    });

    const options = {
      TTL: 60 * 60 * 24 // 24 hours
    };

    const result = await webpush.sendNotification(
      subscription,
      notificationPayload,
      options
    );

    console.log("✅ Push Sent:", result.statusCode);
    return { success: true };

  } catch (error) {
    console.error("❌ Push Error:", error.message);

    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, invalid: true };
    }

    return { success: false, error: error.message };
  }
};

// ======================================
// 📤 SEND BATCH NOTIFICATIONS
// ======================================
export const sendBatchPushNotifications = async (subscriptions, payload) => {
  const results = {
    sent: 0,
    failed: 0,
    invalid: []
  };

  for (const sub of subscriptions) {
    const res = await sendPushNotification(sub, payload);

    if (res.success) {
      results.sent++;
    } else {
      results.failed++;
      if (res.invalid) {
        results.invalid.push(sub);
      }
    }
  }

  console.log(
    `📊 Batch: ${results.sent} sent, ${results.failed} failed`
  );

  return results;
};

// ======================================
// ✅ VALIDATE SUBSCRIPTION
// ======================================
export const isValidSubscription = (subscription) => {
  return (
    subscription &&
    subscription.endpoint &&
    subscription.keys &&
    subscription.keys.p256dh &&
    subscription.keys.auth
  );
};

export default {
  initializePushNotifications,
  sendPushNotification,
  sendBatchPushNotifications,
  isValidSubscription,
};