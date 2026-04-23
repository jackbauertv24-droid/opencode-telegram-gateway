import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { createSession, getActiveSession } from "../../store/sessions.js";
import * as opencode from "../../opencode/index.js";
import { logger } from "../../logger.js";

export async function handleNew(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
  const title = args.length > 0 ? args.join(" ") : undefined;

  await ctx.reply("Creating new session...");

  try {
    const session = await opencode.createSession(title);
    const userSession = createSession(userId, session.id, title);

    logger.info(
      { telegramId: userId, opencodeSessionId: session.id },
      "Created new session"
    );

    await ctx.reply(
      `✅ *New session created*\n\n` +
        `Session ID: \`${userSession.id.slice(0, 8)}...\`\n` +
        `OpenCode Session: \`${session.id}\`\n` +
        (title ? `Title: ${title}` : ""),
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logger.error({ err }, "Failed to create session");
    await ctx.reply(
      `❌ Failed to create session.\n\n` +
        `Make sure OpenCode serve is running.`
    );
  }
}
