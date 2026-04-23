import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { getActiveSession, getLastUsedSession } from "../../store/sessions.js";
import { compactSession } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handleCompact(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const session = getActiveSession(userId) || getLastUsedSession(userId);

  if (!session) {
    await ctx.reply("No active session.\n\nUse /new to create one.");
    return;
  }

  await ctx.reply("🔄 Compacting session...");

  try {
    await compactSession(session.opencode_session_id);

    logger.info(
      { telegramId: userId, sessionId: session.id },
      "Session compacted"
    );

    await ctx.reply("✅ Session compacted successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to compact session");
    await ctx.reply("❌ Failed to compact session.");
  }
}
