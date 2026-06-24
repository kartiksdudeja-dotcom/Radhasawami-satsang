import { getPool } from "./db.js";
import sql from "mssql";

export const ensureTablesExist = async () => {
  try {
    const pool = await getPool();
    console.log("🛠️ Checking for required notification tables...");

    // 1. push_subscriptions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[push_subscriptions]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[push_subscriptions] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [uid] NVARCHAR(50) NOT NULL,
          [endpoint] NVARCHAR(MAX) NOT NULL,
          [p256dh] NVARCHAR(MAX) NOT NULL,
          [auth] NVARCHAR(MAX) NOT NULL,
          [created_at] DATETIME DEFAULT GETUTCDATE()
        );
        CREATE INDEX [IX_push_subscriptions_uid] ON [dbo].[push_subscriptions] ([uid]);
        PRINT '✅ Created push_subscriptions table';
      END
    `);

    // 2. notifications table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[notifications] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [uid] NVARCHAR(50) NULL,
          [title] NVARCHAR(200) NOT NULL,
          [message] NVARCHAR(MAX) NOT NULL,
          [type] NVARCHAR(50) DEFAULT 'general',
          [send_to_all] BIT DEFAULT 0,
          [read] BIT DEFAULT 0,
          [created_at] DATETIME DEFAULT GETUTCDATE()
        );
        CREATE INDEX [IX_notifications_uid] ON [dbo].[notifications] ([uid]);
        PRINT '✅ Created notifications table';
      END
    `);

    // 3. Log current status
    const countResult = await pool.request().query("SELECT COUNT(*) as count FROM push_subscriptions");
    console.log(`📡 Current push subscriptions: ${countResult.recordset[0].count}`);

    console.log("✅ Table check completed");
  } catch (error) {
    console.error("❌ Error ensuring tables exist:", error.message);
  }
};
