import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import type { UserSession } from "../types.js";

export function getActiveSession(telegramId: string): UserSession | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM user_sessions WHERE telegram_id = ? AND is_active = 1 ORDER BY last_used_at DESC LIMIT 1"
    )
    .get(telegramId) as UserSession | undefined;
}

export function getLastUsedSession(telegramId: string): UserSession | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM user_sessions WHERE telegram_id = ? ORDER BY last_used_at DESC LIMIT 1"
    )
    .get(telegramId) as UserSession | undefined;
}

export function listUserSessions(telegramId: string): UserSession[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM user_sessions WHERE telegram_id = ? ORDER BY last_used_at DESC"
    )
    .all(telegramId) as UserSession[];
}

export function createSession(
  telegramId: string,
  opencodeSessionId: string,
  title?: string
): UserSession {
  const db = getDb();
  const id = randomUUID();

  db.prepare(
    "UPDATE user_sessions SET is_active = 0 WHERE telegram_id = ?"
  ).run(telegramId);

  db.prepare(
    "INSERT INTO user_sessions (id, telegram_id, opencode_session_id, is_active, title, last_used_at) VALUES (?, ?, ?, 1, ?, datetime('now'))"
  ).run(id, telegramId, opencodeSessionId, title ?? null);

  return {
    id,
    telegram_id: telegramId,
    opencode_session_id: opencodeSessionId,
    is_active: 1,
    title: title ?? null,
    created_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  };
}

export function switchSession(telegramId: string, sessionId: string): UserSession | undefined {
  const db = getDb();
  const session = db
    .prepare(
      "SELECT * FROM user_sessions WHERE id = ? AND telegram_id = ?"
    )
    .get(sessionId, telegramId) as UserSession | undefined;

  if (!session) return undefined;

  db.prepare(
    "UPDATE user_sessions SET is_active = 0 WHERE telegram_id = ?"
  ).run(telegramId);
  db.prepare("UPDATE user_sessions SET is_active = 1 WHERE id = ?").run(
    sessionId
  );

  return session;
}

export function deleteSession(
  telegramId: string,
  sessionId: string
): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM user_sessions WHERE id = ? AND telegram_id = ?")
    .run(sessionId, telegramId);
  return result.changes > 0;
}

export function touchSession(opencodeSessionId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE user_sessions SET last_used_at = datetime('now') WHERE opencode_session_id = ?"
  ).run(opencodeSessionId);
}

export function getSessionByOpenCodeId(
  opencodeSessionId: string
): UserSession | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_sessions WHERE opencode_session_id = ?")
    .get(opencodeSessionId) as UserSession | undefined;
}
