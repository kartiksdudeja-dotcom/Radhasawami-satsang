import { getPool } from "./config/db.js";
import sql from "mssql";

async function setupSatsangCategories() {
  try {
    const pool = await getPool();
    console.log("Connected to DB. Creating SatsangCategories table...");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SatsangCategories')
      BEGIN
        CREATE TABLE SatsangCategories (
          ID INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(255) NOT NULL UNIQUE,
          CreatedAt DATETIME DEFAULT GETDATE()
        );
        
        INSERT INTO SatsangCategories (Name) VALUES 
        ('Video Satsang'),
        ('Branch Satsang'),
        ('Audio Satsang'),
        ('Music Satsang');
        
        print 'Table created and defaults inserted.';
      END
      ELSE
      BEGIN
        print 'Table already exists.';
      END
    `);

    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

setupSatsangCategories();
