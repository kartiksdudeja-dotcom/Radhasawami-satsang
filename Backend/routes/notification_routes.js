import express from 'express';
import { getPool } from '../config/db.js';
import sql from 'mssql';
import {
  sendPushNotification,
  sendBatchPushNotifications,
  isValidSubscription,
} from '../utils/push_notifications.js';

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();


// 🔐 Get notifications (logged-in user)
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const userId = String(req.user.id); // ✅ from JWT — convert int to string for NVarChar

    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.NVarChar(50), userId)
      .query(`
        SELECT * FROM notifications 
        WHERE (uid = @uid) OR (send_to_all = 1)
        ORDER BY created_at DESC, id DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 🔐 Subscribe (logged-in user)
router.post('/notifications/subscribe', verifyToken, async (req, res) => {
  try {
    const user_id = String(req.user.id); // ✅ from JWT — convert int to string for NVarChar
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ success: false, error: 'subscription required' });
    }

    if (!isValidSubscription(subscription)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription object' });
    }

    const pool = await getPool();

    await pool.request()
      .input('uid', sql.NVarChar(50), String(user_id))
      .input('endpoint', sql.NVarChar(sql.MAX), String(subscription.endpoint || ''))
      .input('p256dh', sql.NVarChar(sql.MAX), String(subscription.keys?.p256dh || ''))
      .input('auth', sql.NVarChar(sql.MAX), String(subscription.keys?.auth || ''))
      .query(`
        IF EXISTS (SELECT 1 FROM push_subscriptions WHERE uid = @uid AND endpoint = @endpoint)
        BEGIN
            UPDATE push_subscriptions 
            SET p256dh = @p256dh, auth = @auth, created_at = GETUTCDATE()
            WHERE uid = @uid AND endpoint = @endpoint;
        END
        ELSE
        BEGIN
            INSERT INTO push_subscriptions (uid, endpoint, p256dh, auth, created_at)
            VALUES (@uid, @endpoint, @p256dh, @auth, GETUTCDATE());
        END
      `);

    res.json({ success: true, message: 'Subscription saved' });

  } catch (error) {
    console.error('❌ Subscribe error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 🔐 Mark as read (logged-in user)
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE notifications SET [read] = 1 WHERE id = @id');

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 🔐 Delete notification (logged-in user)
router.delete('/notifications/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM notifications WHERE id = @id');

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 👑 ADMIN: Send notification
router.post('/notifications', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { uid, title, message, type, sendPush, send_to_all } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'title and message required' });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('uid', sql.NVarChar(50), send_to_all ? null : uid)
      .input('title', sql.NVarChar(200), title)
      .input('message', sql.NVarChar(sql.MAX), message)
      .input('type', sql.NVarChar(50), type || 'general')
      .input('send_to_all', sql.Bit, send_to_all ? 1 : 0)
      .query(`
        INSERT INTO notifications (uid, title, message, type, send_to_all, created_at)
        VALUES (@uid, @title, @message, @type, @send_to_all, GETUTCDATE());
      `);

    // 🔔 Send Web Push if requested
    if (sendPush) {
      try {
        let subQuery = "SELECT endpoint, p256dh, auth FROM push_subscriptions";
        const subReq = pool.request();
        
        if (!send_to_all && uid) {
          subQuery += " WHERE uid = @uid";
          subReq.input('targetUid', sql.NVarChar(50), String(uid));
          subQuery = subQuery.replace('@uid', '@targetUid'); // Avoid collision with previously set @uid if any
        }

        const subResult = await subReq.query(subQuery);
        const subscriptions = subResult.recordset.map(s => ({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        }));

        if (subscriptions.length > 0) {
          console.log(`🚀 Sending push to ${subscriptions.length} subscribers...`);
          await sendBatchPushNotifications(subscriptions, { title, message, type });
        }
      } catch (pushErr) {
        console.error('❌ Push sending failed:', pushErr.message);
      }
    }

    res.json({ success: true, message: 'Notification sent' });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 🔐 Stats (logged-in user)
router.get('/notifications/stats', verifyToken, async (req, res) => {
  try {
    const userId = String(req.user.id); // ✅ convert int to string for NVarChar

    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.NVarChar(50), userId)
      .query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN [read] = 1 THEN 1 ELSE 0 END) as readCount,
          SUM(CASE WHEN [read] = 0 THEN 1 ELSE 0 END) as unreadCount
        FROM notifications
        WHERE (uid = @uid OR send_to_all = 1)
      `);

    res.json({ success: true, data: result.recordset[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;