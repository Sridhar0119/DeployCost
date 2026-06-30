import dotenv from 'dotenv';
dotenv.config();

import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/deploycost.db';

// Ensure parent directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`[Database] Connecting to SQLite database at: ${DB_PATH}`);
const db = new DatabaseSync(DB_PATH);

// Run initialization pragmas
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Schema creation
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    oauth_provider TEXT NOT NULL CHECK (oauth_provider IN ('google', 'github', 'dev')),
    oauth_id TEXT NOT NULL,
    org_id INTEGER REFERENCES organizations(id),
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'org_admin', 'super_admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(oauth_provider, oauth_id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    session_json TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    specs_json TEXT NOT NULL,
    results_json TEXT NOT NULL,
    cheapest_platform TEXT,
    monthly_cost_usd REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    type TEXT NOT NULL CHECK (type IN ('cost_threshold', 'estimate_run', 'upload_failed')),
    message TEXT NOT NULL,
    metadata_json TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS org_settings (
    org_id INTEGER PRIMARY KEY REFERENCES organizations(id),
    cost_alert_threshold_usd REAL,
    default_cpu INTEGER NOT NULL DEFAULT 2,
    default_ram INTEGER NOT NULL DEFAULT 4,
    default_storage INTEGER NOT NULL DEFAULT 50,
    default_bandwidth INTEGER NOT NULL DEFAULT 20
  );

  CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    total_size INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    chunks_received INTEGER NOT NULL DEFAULT 0,
    received_chunks_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed','expired')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log('[Database] Tables initialized successfully.');

export default db;
