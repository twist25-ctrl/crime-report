/**
 * Database setup script
 * Run: node setup.js
 * Creates the database, tables, and seeds default data.
 */
require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('🔧 Starting database setup...\n');

  // Connect without specifying a database first
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    port:     process.env.DB_PORT     || 3306,
    multipleStatements: true,
  });

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schema);
    console.log('✅ Schema created successfully');

    // Create admin with proper bcrypt hash
    const adminEmail = 'admin@crimereport.com';
    const [existing] = await conn.query(
      'SELECT id FROM crime_report_system.users WHERE email = ?',
      [adminEmail]
    );

    if (existing.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await conn.query(
        `INSERT INTO crime_report_system.users (name, email, password, role)
         VALUES (?, ?, ?, 'admin')`,
        ['System Admin', adminEmail, hash]
      );
      console.log('✅ Admin account created (admin@crimereport.com / admin123)');
    } else {
     // Update password hash to ensure it's valid
      const hash = await bcrypt.hash('admin123', 10);
      await conn.query(
        'UPDATE crime_report_system.users SET password = ? WHERE email = ?',
        [hash, adminEmail]
      );
      console.log('✅ Admin account already exists — password reset to admin123');
    }

    console.log('\n🎉 Setup complete! You can now run: npm run dev');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

setup();
