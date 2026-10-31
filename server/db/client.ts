import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_URL || path.resolve(process.cwd(), 'data', 'sqlite.db');

// Ensure data folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

/**
 * Initializes database tables if they do not exist.
 */
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_datetime TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      order_value REAL NOT NULL,
      items TEXT NOT NULL,
      num_items INTEGER NOT NULL,
      customer_prior_orders INTEGER NOT NULL DEFAULT 0,
      customer_prior_rto INTEGER NOT NULL DEFAULT 0,
      utm_source TEXT,
      courier TEXT,
      payment_method TEXT NOT NULL DEFAULT 'COD',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outcomes (
      order_id TEXT PRIMARY KEY REFERENCES orders(id),
      final_status TEXT NOT NULL,
      known_at TEXT
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      action TEXT NOT NULL,
      workflow_state TEXT NOT NULL,
      probability REAL NOT NULL,
      risk_band TEXT NOT NULL,
      explanation TEXT NOT NULL,
      reason_codes_json TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      economics_json TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      model_version TEXT NOT NULL,
      assessment_source TEXT NOT NULL DEFAULT 'heuristic',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      state TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      customer_phone TEXT NOT NULL,
      virtual_now TEXT NOT NULL,
      outreach_suppressed INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      direction TEXT NOT NULL,
      body TEXT NOT NULL,
      intent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      original_amount REAL NOT NULL,
      discount_amount REAL NOT NULL,
      final_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      job_type TEXT NOT NULL,
      due_at TEXT NOT NULL,
      processed_at TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      source_checksum TEXT NOT NULL,
      file_label TEXT NOT NULL,
      raw_count INTEGER NOT NULL,
      unique_count INTEGER NOT NULL,
      resolved_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_datetime ON orders(order_datetime);
    CREATE INDEX IF NOT EXISTS idx_decisions_order ON decisions(order_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_order ON conversations(order_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  `);
}

// Auto-run table initialization on import
initDb();
