import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import {
  getActiveSession,
  getLastUsedSession,
  createSession,
  touchSession,
} from "../../store/sessions.js";
import { registerChatId } from "./sse-router.js";
import * as opencode from "../../opencode/index.js";
import { startStreaming } from "./streaming.js";
import { logger } from "../../logger.js";

export const processingUsers = new Set<string>();

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
    await opencode.sendAsyncMessage(session.opencode_session_id, text);

    touchSession(session.opencode_session_id);

    startStreaming(
      session.opencode_session_id,
      chatId,
      waitingMsg.message_id,
      userId
    );
  } catch (err) {
    logger.error({ err }, "Failed to send message");
    await ctx.api.editMessageText(
      chatId,
      waitingMsg.message_id,
      "❌ Failed to process message. Is OpenCode serve running?"
    );
    processingUsers.delete(userId);
  }
}
