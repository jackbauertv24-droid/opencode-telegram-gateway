import { Context } from "grammy";
import { isUserApproved, getAutoApprove, setAutoApprove } from "../../store/users.js";

export async function handleApprove(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized. Use /start to get your ID.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];

  if (args.length === 0) {
    const current = getAutoApprove(userId);
    await ctx.reply(
      `*Auto-approve status:*${
        current ? " ON ✅" : " OFF ❌"
      }\n\n` +
        "Usage:\n" +
        `/approve on - Auto-approve all permissions\n` +
        `/approve off - Prompt for each permission`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const arg = args[0].toLowerCase();
  const enabled = arg === "on" || arg === "true" || arg === "1";
  const disabled = arg === "off" || arg === "false" || arg === "0";

  if (!enabled && !disabled) {
    await ctx.reply(
      "Invalid argument. Use /approve on or /approve off"
    );
    return;
  }

  setAutoApprove(userId, enabled);
  await ctx.reply(
    `✅ Auto-approve is now ${enabled ? "ON" : "OFF"}.\n\n` +
      (enabled
        ? "All permissions will be automatically approved.\n" +
          "⚠️ This may be risky!"
        : "You'll be prompted for each permission.")
  );
}
