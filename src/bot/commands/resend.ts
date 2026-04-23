import { Context, InputFile } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { getActiveSession, getLastUsedSession } from "../../store/sessions.js";
import { getLastCachedMessage } from "../../store/cache.js";
import { logger } from "../../logger.js";

export async function handleResend(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const activeSession = getActiveSession(userId);
  const lastSession = activeSession || getLastUsedSession(userId);

  if (!lastSession) {
    await ctx.reply("No session found. Use /new to create one.");
    return;
  }

  const cached = getLastCachedMessage(userId, lastSession.opencode_session_id);

  if (!cached) {
    await ctx.reply("No cached message found. Send a message first.");
    return;
  }

  try {
    const buffer = Buffer.from(cached.full_content, "utf-8");
    const filename = `opencode-response-${Date.now()}.txt`;

    await ctx.replyWithDocument(
      new InputFile(buffer, filename),
      {
        caption: `📄 Last response (${cached.chunks_count} chunks, ${cached.full_content.length} chars)`,
      }
    );

    logger.info(
      { telegramId: userId, sessionId: lastSession.id },
      "Resent message as file"
    );
  } catch (err) {
    logger.error({ err }, "Failed to resend message");
    await ctx.reply("Failed to send file.");
  }
}
