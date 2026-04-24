import { sseSubscriber } from "../../opencode/sse.js";
import { logger } from "../../logger.js";
import { chunkMessage } from "../../utils/chunk.js";
import { cacheMessage } from "../../store/cache.js";
import { processingUsers } from "./message.js";

interface StreamingSession {
  chatId: number;
  messageId: number;
  telegramId: string;
  sessionId: string;
  parts: Map<string, { type: string; text: string }>;
  userMessageId: string | null;
  lastEdit: number;
  completed: boolean;
}

const streamingSessions = new Map<string, StreamingSession>();
const MIN_EDIT_INTERVAL = 1500;

export function startStreaming(
  sessionId: string,
  chatId: number,
  messageId: number,
  telegramId: string
): void {
  const session: StreamingSession = {
    chatId,
    messageId,
    telegramId,
    sessionId,
    parts: new Map(),
    userMessageId: null,
    lastEdit: 0,
    completed: false,
  };

  streamingSessions.set(sessionId, session);
  logger.info({ sessionId, chatId }, "Started streaming session");
}

export function stopStreaming(sessionId: string): void {
  streamingSessions.delete(sessionId);
}

export function setupStreamingHandlers(): void {
  sseSubscriber.on("message.part.delta", handlePartDelta);
  sseSubscriber.on("message.part.updated", handlePartUpdated);
  sseSubscriber.on("session.idle", handleSessionIdle);
}

async function handlePartDelta(event: unknown): Promise<void> {
  const evt = event as {
    properties: {
      sessionID: string;
      messageID: string;
      partID: string;
      field: string;
      delta: string;
    };
  };

  const props = evt.properties;
  if (!props?.sessionID || !props?.partID || !props?.delta) return;

  const session = streamingSessions.get(props.sessionID);
  if (!session || session.completed) return;

  if (session.userMessageId === null) {
    session.userMessageId = props.messageID;
  }

  if (props.messageID === session.userMessageId) return;

  const existing = session.parts.get(props.partID);
  if (existing) {
    existing.text += props.delta;
  } else {
    session.parts.set(props.partID, { type: "text", text: props.delta });
  }

  await maybeUpdateMessage(session);
}

async function handlePartUpdated(event: unknown): Promise<void> {
  const evt = event as {
    properties: {
      sessionID: string;
      part: {
        id: string;
        type: string;
        text?: string;
        messageID: string;
      };
    };
  };

  const props = evt.properties;
  if (!props?.sessionID || !props?.part) return;

  const session = streamingSessions.get(props.sessionID);
  if (!session || session.completed) return;

  const part = props.part;

  if (session.userMessageId === null) {
    session.userMessageId = part.messageID;
  }

  if (part.messageID === session.userMessageId) return;

  if (part.type === "text" && part.text) {
    session.parts.set(part.id, { type: "text", text: part.text });
  } else if (part.type === "reasoning" && part.text) {
    session.parts.set(part.id, { type: "reasoning", text: part.text });
  }

  await maybeUpdateMessage(session);
}

async function handleSessionIdle(event: unknown): Promise<void> {
  const evt = event as {
    properties: {
      sessionID: string;
    };
  };

  const props = evt.properties;
  if (!props?.sessionID) return;

  const session = streamingSessions.get(props.sessionID);
  if (!session || session.completed) return;

  session.completed = true;

  await finalizeMessage(session);

  streamingSessions.delete(props.sessionID);
  processingUsers.delete(session.telegramId);
}

async function maybeUpdateMessage(session: StreamingSession): Promise<void> {
  const now = Date.now();
  if (now - session.lastEdit < MIN_EDIT_INTERVAL) return;

  session.lastEdit = now;
  await updateMessage(session);
}

async function updateMessage(session: StreamingSession): Promise<void> {
  const { text, hasReasoning } = buildText(session);

  if (!text) return;

  try {
    const { bot } = await import("../index.js");

    let displayText = text.slice(0, 4000);
    if (text.length > 4000) {
      displayText += "\n\n_...continuing..._";
    }

    if (hasReasoning) {
      displayText = "💭 _thinking..._\n\n" + displayText;
    }

    await bot?.api.editMessageText(
      session.chatId,
      session.messageId,
      displayText,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logger.debug({ err }, "Failed to update streaming message");
  }
}

async function finalizeMessage(session: StreamingSession): Promise<void> {
  const { text } = buildText(session);

  if (!text) {
    try {
      const { bot } = await import("../index.js");
      await bot?.api.editMessageText(
        session.chatId,
        session.messageId,
        "OpenCode did not return a response."
      );
    } catch {}
    return;
  }

  const chunks = chunkMessage(text);
  cacheMessage(session.telegramId, session.sessionId, text, chunks.length);

  try {
    const { bot } = await import("../index.js");
    await bot?.api.deleteMessage(session.chatId, session.messageId);

    for (const chunk of chunks) {
      await bot?.api.sendMessage(session.chatId, chunk, { parse_mode: "Markdown" });
    }

    logger.info(
      { telegramId: session.telegramId, sessionId: session.sessionId, chunks: chunks.length },
      "Message processed (streaming)"
    );
  } catch (err) {
    logger.error({ err }, "Failed to finalize streaming message");
  }
}

function buildText(session: StreamingSession): { text: string; hasReasoning: boolean } {
  let text = "";
  let hasReasoning = false;

  const sortedParts = Array.from(session.parts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [, part] of sortedParts) {
    if (part.type === "reasoning") {
      hasReasoning = true;
    } else if (part.type === "text") {
      text += part.text;
    }
  }

  return { text, hasReasoning };
}
