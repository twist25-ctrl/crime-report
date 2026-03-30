const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Credentials from prompt
const config = {
  host: 'hopper.proxy.rlwy.net',
  user: 'root',
  password: 'AIYIOBttVgDTmaZjOUilCbZOnLhgeCHY',
  port: 50892,
  database: 'railway', 
  multipleStatements: true
};

async function setup() {
  console.log('Connecting to Railway MySQL at hopper.proxy.rlwy.net...');
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected!');

    const schemaPath = path.join(__dirname, '../../schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Remove local database creation and usage
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS crime_report_system\s*;?/gi, '-- removed')
             .replace(/USE crime_report_system\s*;?/gi, '-- removed');

    console.log('Executing SQL schema...');
    await connection.query(sql);
    console.log('SQL execution completed successfully.');

    // Verify
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Current tables in "railway":', tables.map(t => Object.values(t)[0]));

    // Verify categories seed
    const [cats] = await connection.query('SELECT COUNT(*) as count FROM categories');
    console.log(`Seeded ${cats[0].count} categories.`);

    // Verify admin seed
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role="admin"');
    console.log(`Seeded ${admins[0].count} admin account.`);

    console.log('\n--- Setup Finished Successfully ---');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setup();
