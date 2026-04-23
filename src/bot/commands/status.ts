import { Context } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { getActiveSession, getLastUsedSession } from "../../store/sessions.js";
import { getSession } from "../../opencode/client.js";

export async function handleStatus(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const activeSession = getActiveSession(userId);
  const lastSession = activeSession || getLastUsedSession(userId);

  if (!lastSession) {
    await ctx.reply(
      "No active session.\n\nUse /new to create one."
    );
    return;
  }

  let opencodeSessionInfo = "";
  try {
    const ocSession = await getSession(lastSession.opencode_session_id);
    opencodeSessionInfo =
      `\n\n*OpenCode Info:*\n` +
      `Project: \`${ocSession.projectID}\`\n` +
      `Directory: \`${ocSession.directory}\`\n` +
      `Created: ${new Date(ocSession.time.created).toLocaleString()}`;
  } catch {
    opencodeSessionInfo = "\n\n(Unable to fetch OpenCode session info)";
  }

  await ctx.reply(
    `📊 *Current Session*\n\n` +
      `Session ID: \`${lastSession.id.slice(0, 8)}...\`\n` +
      `OpenCode: \`${lastSession.opencode_session_id}\`\n` +
      (lastSession.title ? `Title: ${lastSession.title}\n` : "") +
      `Status: ${lastSession.is_active ? "Active ✅" : "Inactive"}\n` +
      `Last used: ${new Date(
        lastSession.last_used_at || lastSession.created_at
      ).toLocaleString()}` +
      opencodeSessionInfo,
    { parse_mode: "Markdown" }
  );
}
