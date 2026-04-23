import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { getActiveSession, getLastUsedSession } from "../../store/sessions.js";
import { abortSession } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handleCancel(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const activeSession = getActiveSession(userId);
  const lastSession = activeSession || getLastUsedSession(userId);

  if (!lastSession) {
    await ctx.reply("No session to cancel.");
    return;
  }

  try {
    await abortSession(lastSession.opencode_session_id);
    logger.info(
      { opencodeSessionId: lastSession.opencode_session_id },
      "Aborted session"
    );
    await ctx.reply("✅ Current operation cancelled.");
  } catch (err) {
    logger.error({ err }, "Failed to abort session");
    await ctx.reply(
      "Failed to cancel. The session may not be running."
    );
  }
}
