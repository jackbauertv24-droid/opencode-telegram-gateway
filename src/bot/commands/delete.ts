import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { deleteSession, listUserSessions } from "../../store/sessions.js";
import { abortSession, deleteSession as deleteOpenCodeSession } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handleDelete(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];

  if (args.length === 0) {
    await ctx.reply(
      "Usage: /delete <session_id>\n\n" +
        "Use /sessions to see your sessions."
    );
    return;
  }

  let sessionId = args[0];

  const sessions = listUserSessions(userId);
  const matchingSession = sessions.find((s) => s.id.startsWith(sessionId));

  if (!matchingSession) {
    await ctx.reply(
      `Session not found: \`${sessionId}\`\n\n` +
        "Use /sessions to see your sessions.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  try {
    await deleteOpenCodeSession(matchingSession.opencode_session_id);
    logger.info(
      { opencodeSessionId: matchingSession.opencode_session_id },
      "Deleted OpenCode session"
    );
  } catch (err) {
    logger.warn({ err }, "Failed to delete OpenCode session (may not exist)");
  }

  const deleted = deleteSession(userId, matchingSession.id);

  if (deleted) {
    await ctx.reply(
      `✅ Deleted session: \`${matchingSession.id.slice(0, 8)}...\``,
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.reply("Failed to delete session.");
  }
}
