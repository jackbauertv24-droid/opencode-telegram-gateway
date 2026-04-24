import { getDb } from "./db.js";
import type { ApprovedUser } from "../types.js";

export function isUserApproved(telegramId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM approved_users WHERE telegram_id = ?")
    .get(telegramId);
  return !!row;
}

export function getApprovedUser(telegramId: string): ApprovedUser | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM approved_users WHERE telegram_id = ?")
    .get(telegramId) as ApprovedUser | undefined;
}

export function listApprovedUsers(): ApprovedUser[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM approved_users ORDER BY created_at DESC")
    .all() as ApprovedUser[];
}

export function addApprovedUser(
  telegramId: string,
  displayName?: string
): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO approved_users (telegram_id, display_name) VALUES (?, ?)"
  ).run(telegramId, displayName ?? null);
}

export function removeApprovedUser(telegramId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM approved_users WHERE telegram_id = ?").run(
    telegramId
  );
  db.prepare("DELETE FROM user_sessions WHERE telegram_id = ?").run(
    telegramId
  );
}

export function getAutoApprove(telegramId: string): boolean {
  const user = getApprovedUser(telegramId);
  return user?.auto_approve === 1;
}

export function setAutoApprove(telegramId: string, enabled: boolean): void {
  const db = getDb();
  db.prepare(
    "UPDATE approved_users SET auto_approve = ? WHERE telegram_id = ?"
  ).run(enabled ? 1 : 0, telegramId);
}

export function getUserModel(telegramId: string): { providerId: string; modelId: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT provider_id, model_id FROM user_model_preferences WHERE telegram_id = ?")
    .get(telegramId) as { provider_id: string; model_id: string } | undefined;
  return row ? { providerId: row.provider_id, modelId: row.model_id } : null;
}

export function setUserModel(telegramId: string, providerId: string, modelId: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO user_model_preferences (telegram_id, provider_id, model_id) VALUES (?, ?, ?)"
  ).run(telegramId, providerId, modelId);
}

export function clearUserModel(telegramId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM user_model_preferences WHERE telegram_id = ?").run(telegramId);
}
