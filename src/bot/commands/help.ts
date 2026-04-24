import { Context } from "grammy";

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    `📚 *OpenCode Telegram Gateway Help*\n\n` +
      `*Getting Started:*\n` +
      `1. Ask admin to approve your Telegram ID\n` +
      `2. Use /new to create a session\n` +
      `3. Send any message to interact with OpenCode\n\n` +
      `*Commands:*\n` +
      `/start - Show welcome message & your ID\n` +
      `/new [title] - Create new session\n` +
      `/sessions - List your sessions\n` +
      `/switch <id> - Switch to a session\n` +
      `/delete <id> - Delete a session\n` +
      `/status - Show current session info\n` +
      `/compact - Compact/summarize session\n` +
      `/models - Switch AI model\n` +
      `/resend - Get last response as .txt\n` +
      `/approve on/off - Toggle auto-approve\n` +
      `/cancel - Cancel current operation\n` +
      `/help - Show this message\n\n` +
      `*Tips:*\n` +
      `• Messages continue the last used session\n` +
      `• Long responses are split into chunks\n` +
      `• Use /resend to get full response as file\n` +
      `• Permissions use inline buttons - just tap to approve/deny`,
    { parse_mode: "Markdown" }
  );
}
