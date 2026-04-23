import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import type { MessageCache } from "../types.js";

export function cacheMessage(
  telegramId: string,
  opencodeSessionId: string,
  fullContent: string,
  chunksCount: number
): MessageCache {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO message_cache (id, telegram_id, opencode_session_id, full_content, chunks_count) VALUES (?, ?, ?, ?, ?)"
  ).run(id, telegramId, opencodeSessionId, fullContent, chunksCount);
  return {
    id,
    telegram_id: telegramId,
    opencode_session_id: opencodeSessionId,
    full_content: fullContent,
    chunks_count: chunksCount,
    created_at: new Date().toISOString(),
  };
}

export function getLastCachedMessage(
  telegramId: string,
  opencodeSessionId: string
): MessageCache | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM message_cache WHERE telegram_id = ? AND opencode_session_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(telegramId, opencodeSessionId) as MessageCache | undefined;
}
