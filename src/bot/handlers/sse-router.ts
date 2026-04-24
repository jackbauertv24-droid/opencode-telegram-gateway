import { sseSubscriber } from "../../opencode/sse.js";
import { getSessionByOpenCodeId } from "../../store/sessions.js";
import { isUserApproved } from "../../store/users.js";
import { promptPermission } from "./permission.js";
import { setupStreamingHandlers } from "./streaming.js";
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
  setupStreamingHandlers();
  sseSubscriber.on("permission.asked", handlePermissionEvent);
  sseSubscriber.on("*", handleWildcardEvent);
}

async function handlePermissionEvent(event: SSEEvent): Promise<void> {
  logger.info({ event }, "Permission event received");

  const props = event.properties as {
    id: string;
    sessionID: string;
    permission: string;
    patterns?: string[];
    metadata?: Record<string, unknown>;
    title?: string;
  };

  if (!props || !props.id || !props.sessionID) {
    logger.warn({ event }, "Permission event missing required fields");
    return;
  }

  const session = getSessionByOpenCodeId(props.sessionID);
  if (!session) {
    logger.warn(
      { sessionID: props.sessionID },
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

  const actionType = props.permission || "unknown";
  const actionDetail = props.patterns
    ? `Patterns: ${props.patterns.join(", ")}`
    : props.title || undefined;

  await promptPermission(
    telegramId,
    chatId,
    props.sessionID,
    props.id,
    actionType,
    actionDetail
  );
}

async function handleWildcardEvent(event: SSEEvent): Promise<void> {
  if (event.type === "server.connected") {
    logger.info("SSE connected to OpenCode serve");
    return;
  }

  if (event.type === "session.status") {
    return;
  }

  if (event.type === "permission.asked") {
    return;
  }

  if (
    event.type === "message.part.delta" ||
    event.type === "message.part.updated" ||
    event.type === "session.idle"
  ) {
    return;
  }

  logger.debug({ eventType: event.type }, "Unhandled SSE event");
}
