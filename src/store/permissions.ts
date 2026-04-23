import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import type { PendingPermission } from "../types.js";

export function createPendingPermission(
  telegramId: string,
  opencodeSessionId: string,
  opencodePermissionId: string,
  actionType: string,
  actionDetail?: string
): PendingPermission {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO pending_permissions (id, telegram_id, opencode_session_id, opencode_permission_id, action_type, action_detail) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    telegramId,
    opencodeSessionId,
    opencodePermissionId,
    actionType,
    actionDetail ?? null
  );
  return {
    id,
    telegram_id: telegramId,
    opencode_session_id: opencodeSessionId,
    opencode_permission_id: opencodePermissionId,
    action_type: actionType,
    action_detail: actionDetail ?? null,
    telegram_message_id: null,
    status: "pending",
    created_at: new Date().toISOString(),
  };
}

export function getPendingPermission(
  opencodePermissionId: string
): PendingPermission | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM pending_permissions WHERE opencode_permission_id = ? AND status = 'pending'"
    )
    .get(opencodePermissionId) as PendingPermission | undefined;
}

export function getPendingPermissionsForUser(
  telegramId: string
): PendingPermission[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM pending_permissions WHERE telegram_id = ? AND status = 'pending' ORDER BY created_at DESC"
    )
    .all(telegramId) as PendingPermission[];
}

export function updatePermissionStatus(
  id: string,
  status: "approved" | "denied" | "expired"
): void {
  const db = getDb();
  db.prepare("UPDATE pending_permissions SET status = ? WHERE id = ?").run(
    status,
    id
  );
}

export function setPermissionTelegramMessageId(
  id: string,
  messageId: number
): void {
  const db = getDb();
  db.prepare(
    "UPDATE pending_permissions SET telegram_message_id = ? WHERE id = ?"
  ).run(messageId, id);
}

export function expireOldPermissions(maxAgeMs: number = 5 * 60 * 1000): void {
  const db = getDb();
  db.prepare(
    "UPDATE pending_permissions SET status = 'expired' WHERE status = 'pending' AND created_at < datetime('now', ? || ' milliseconds')"
  ).run(`-${maxAgeMs}`);
}
