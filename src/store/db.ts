import Database from "better-sqlite3";
import { resolve } from "path";
import { config, ensureDataDir } from "../config.js";
import { logger } from "../logger.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    const dbPath = resolve(config.databasePath);
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    logger.info({ path: dbPath }, "Database initialized");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info("Database closed");
  }
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS approved_users (
      telegram_id TEXT PRIMARY KEY,
      display_name TEXT,
      auto_approve INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      opencode_session_id TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT,
      FOREIGN KEY (telegram_id) REFERENCES approved_users(telegram_id)
    );

    CREATE TABLE IF NOT EXISTS pending_permissions (
      id TEXT PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      opencode_session_id TEXT NOT NULL,
      opencode_permission_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_detail TEXT,
      telegram_message_id INTEGER,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_cache (
      id TEXT PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      opencode_session_id TEXT NOT NULL,
      full_content TEXT NOT NULL,
      chunks_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram ON user_sessions(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(telegram_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_pending_permissions_telegram ON pending_permissions(telegram_id, status);
    CREATE INDEX IF NOT EXISTS idx_message_cache_telegram ON message_cache(telegram_id, opencode_session_id);
  `);
  logger.info("Database migrations applied");
}
