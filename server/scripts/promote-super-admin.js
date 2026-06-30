/**
 * DeployCost Dashboard - Super Admin Promotion Utility
 * Usage: node server/scripts/promote-super-admin.js user@example.com
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Fetch user email from arguments
const emailArg = process.argv[2];
if (!emailArg) {
  console.error('❌ Error: Please provide an email address.');
  console.error('Usage: node server/scripts/promote-super-admin.js <email>');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const dbPath = process.env.DB_PATH || './data/deploycost.db';

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Error: Database file not found at "${dbPath}". Has the application been run at least once to build the DB schema?`);
  process.exit(1);
}

try {
  console.log(`[Admin] Opening database at: ${dbPath}`);
  const db = new DatabaseSync(dbPath);

  // Check if user exists
  const checkStmt = db.prepare('SELECT id, name, role FROM users WHERE email = ?');
  const user = checkStmt.get(email);

  if (!user) {
    console.error(`❌ Error: No user found with email address: "${email}"`);
    console.error('Please log in once through the web application first to automatically register the user account.');
    process.exit(1);
  }

  console.log(`[Admin] Found user: "${user.name}" with current role: "${user.role}"`);

  if (user.role === 'super_admin') {
    console.log(`⚠️ User "${email}" is already a "super_admin". No action taken.`);
    process.exit(0);
  }

  // Update role to super_admin
  const updateStmt = db.prepare("UPDATE users SET role = 'super_admin' WHERE id = ?");
  updateStmt.run(user.id);

  console.log(`✅ Success: User "${email}" has been successfully promoted to "super_admin".`);
  process.exit(0);
} catch (err) {
  console.error('❌ SQL/Database error running promotion script:', err);
  process.exit(1);
}
