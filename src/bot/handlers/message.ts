import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import {
  getActiveSession,
  getLastUsedSession,
  createSession,
  touchSession,
} from "../../store/sessions.js";
import { cacheMessage } from "../../store/cache.js";
import { registerChatId } from "./sse-router.js";
import * as opencode from "../../opencode/index.js";
import { chunkMessage } from "../../utils/chunk.js";
import { logger } from "../../logger.js";

const processingUsers = new Set<string>();

export async function handleMessage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();
  const text = ctx.message?.text;

  if (!userId || !text) return;

  const chatId = ctx.chat?.id;
  if (!chatId) return;
  registerChatId(userId, chatId);

  if (!isUserApproved(userId)) {
    await ctx.reply(
      `🔒 You are not authorized.\n\n` +
        `Your Telegram ID: \`${userId}\`\n\n` +
        `Ask admin to run: gateway users add ${userId}`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (processingUsers.has(userId)) {
    await ctx.reply(
      "⏳ Please wait for the previous message to complete."
    );
    return;
  }

  let session = getActiveSession(userId) || getLastUsedSession(userId);

  if (!session) {
    try {
      const ocSession = await opencode.createSession();
      session = createSession(userId, ocSession.id);
      logger.info(
        { telegramId: userId, opencodeSessionId: ocSession.id },
        "Auto-created session for new user"
      );
    } catch (err) {
      logger.error({ err }, "Failed to create session");
      await ctx.reply(
        "❌ Failed to create session. Is OpenCode serve running?"
      );
      return;
    }
  }

  const waitingMsg = await ctx.reply("💬 Processing...");

  processingUsers.add(userId);

  try {
    const result = await opencode.sendSimpleMessage(
      session.opencode_session_id,
      text
    );

    touchSession(session.opencode_session_id);

    let fullContent = "";

    const messages = await opencode.listMessages(
      session.opencode_session_id,
      1
    );
    const lastMessage = messages[0];

    if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
      for (const part of lastMessage.parts) {
        if (part && typeof part === "object" && "text" in part) {
          fullContent += (part as { text: string }).text;
        }
      }
    }

    if (!fullContent && result.info?.error) {
      fullContent = `Error: ${result.info.error}`;
    }

    if (!fullContent) {
      fullContent = "OpenCode did not return a response.";
    }

    const chunks = chunkMessage(fullContent);
    cacheMessage(userId, session.opencode_session_id, fullContent, chunks.length);

    await ctx.api.deleteMessage(
      waitingMsg.chat.id,
      waitingMsg.message_id
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await ctx.reply(chunk, { parse_mode: "Markdown" });
    }

    logger.info(
      {
        telegramId: userId,
        sessionId: session.id,
        chunks: chunks.length,
        length: fullContent.length,
      },
      "Message processed"
    );
  } catch (err) {
    logger.error({ err }, "Failed to send message");
    await ctx.api.editMessageText(
      waitingMsg.chat.id,
      waitingMsg.message_id,
      "❌ Failed to process message. Is OpenCode serve running?"
    );
  } finally {
    processingUsers.delete(userId);
  }
}
