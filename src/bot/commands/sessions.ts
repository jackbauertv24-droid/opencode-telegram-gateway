import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { listUserSessions } from "../../store/sessions.js";

export async function handleSessions(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const sessions = listUserSessions(userId);

  if (sessions.length === 0) {
    await ctx.reply(
      "You have no sessions.\n\nUse /new to create one."
    );
    return;
  }

  const lines = sessions.map((s, i) => {
    const active = s.is_active ? " ✅" : "";
    const title = s.title || "Untitled";
    const shortId = s.id.slice(0, 8);
    const date = new Date(s.last_used_at || s.created_at).toLocaleDateString();
    return `${i + 1}. \`${shortId}\` - ${title}${active} (${date})`;
  });

  await ctx.reply(
    `📋 *Your Sessions*\n\n` +
      lines.join("\n") +
      `\n\nUse \`/switch <id>\` to switch to a session.`,
    { parse_mode: "Markdown" }
  );
}
