// dbTest.js
const dbClient = require('./utils/db'); // adjust path if needed
(async () => {
  // Use an explicitly valid query and print everything for debugging
  const sql = "SELECT CURRENT_TIMESTAMP() AS `server_time`";
  try {
    console.log("Running SQL:", sql);
    // mysql2 promise pool returns [rows, fields]
    const [rows, fields] = await dbClient.db.query(sql);
    console.log('✅ Connected successfully!');
    console.log('Server time:', rows[0].server_time);
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    // print full error object to help debugging
    console.error('Full error:', err);
    process.exit(1);
  }
})();
