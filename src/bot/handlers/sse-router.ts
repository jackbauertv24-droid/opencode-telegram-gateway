import { sseSubscriber } from "../../opencode/sse.js";
import { getSessionByOpenCodeId } from "../../store/sessions.js";
import { isUserApproved } from "../../store/users.js";
import { promptPermission } from "./permission.js";
import { logger } from "../../logger.js";
import type { SSEEvent } from "../../types.js";

const chatIdMap = new Map<string, number>();

export function registerChatId(telegramId: string, chatId: number): void {
  chatIdMap.set(telegramId, chatId);
}

export function getChatId(telegramId: string): number | undefined {
  return chatIdMap.get(telegramId);
}

export function setupSSERouting(): void {
  sseSubscriber.on("permission.updated", handlePermissionEvent);
  sseSubscriber.on("*", handleWildcardEvent);
}

async function handlePermissionEvent(event: SSEEvent): Promise<void> {
  logger.info({ event }, "Permission event received");

  const permission = event as unknown as {
    id: string;
    type: string;
    sessionID: string;
    title: string;
    metadata?: Record<string, unknown>;
  };

  const session = getSessionByOpenCodeId(permission.sessionID);
  if (!session) {
    logger.warn(
      { sessionID: permission.sessionID },
      "No user session found for permission event"
    );
    return;
  }

  const telegramId = session.telegram_id;
  const chatId = getChatId(telegramId);

  if (!chatId) {
    logger.warn(
      { telegramId },
      "No chat ID found for permission prompt"
    );
    return;
  }

  await promptPermission(
    telegramId,
    chatId,
    permission.sessionID,
    permission.id,
    permission.type,
    permission.metadata
      ? JSON.stringify(permission.metadata, null, 2)
      : permission.title
  );
}

async function handleWildcardEvent(event: SSEEvent): Promise<void> {
  if (event.type === "server.connected") {
    logger.info("SSE connected to OpenCode serve");
    return;
  }

  if (event.type === "session.status") {
    const sessionEvent = event as unknown as { sessionID: string; type: string };
    logger.debug(
      { sessionID: sessionEvent.sessionID, type: sessionEvent.type },
      "Session status update"
    );
  }
}
