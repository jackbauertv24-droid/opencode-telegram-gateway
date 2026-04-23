import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { switchSession, listUserSessions } from "../../store/sessions.js";
import { logger } from "../../logger.js";

export async function handleSwitch(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];

  if (args.length === 0) {
    await ctx.reply(
      "Usage: /switch <session_id>\n\n" +
        "Use /sessions to see your sessions."
    );
    return;
  }

  const sessionId = args[0];

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

  const switched = switchSession(userId, matchingSession.id);

  if (switched) {
    logger.info(
      { telegramId: userId, sessionId: switched.id },
      "Switched session"
    );
    await ctx.reply(
      `✅ Switched to session: \`${switched.id.slice(0, 8)}...\`\n` +
        (switched.title ? `Title: ${switched.title}` : ""),
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.reply("Failed to switch session.");
  }
}
