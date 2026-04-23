import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";

export async function handleStart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();
  const userName = ctx.from?.first_name || "User";

  if (!userId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  if (!isUserApproved(userId)) {
    await ctx.reply(
      `🔒 *Access Denied*\n\n` +
        `Your Telegram ID: \`${userId}\`\n\n` +
        `Please ask the gateway administrator to approve you:\n` +
        `\`\`\`\n` +
        `gateway users add ${userId} "${userName}"\n` +
        `\`\`\`\n\n` +
        `Once approved, you can use this gateway to interact with OpenCode.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  await ctx.reply(
    `👋 Welcome back, ${userName}!\n\n` +
      `You're authorized to use this OpenCode gateway.\n\n` +
      `*Available commands:*\n` +
      `/new [title] - Start a new session\n` +
      `/sessions - List your sessions\n` +
      `/switch <id> - Switch to a session\n` +
      `/delete <id> - Delete a session\n` +
      `/status - Show current session\n` +
      `/resend - Get last message as file\n` +
      `/approve on/off - Toggle auto-approve\n` +
      `/cancel - Cancel current operation\n` +
      `/help - Show this help\n\n` +
      `Just send a message to interact with OpenCode!`,
    { parse_mode: "Markdown" }
  );
}
