import { Context, InlineKeyboard } from "grammy";
import { isUserApproved, getAutoApprove } from "../../store/users.js";
import {
  createPendingPermission,
  getPendingPermissionByLocalId,
  updatePermissionStatus,
} from "../../store/permissions.js";
import { replyPermission } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handlePermissionCallback(ctx: Context): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery?.data) return;

  const userId = callbackQuery.from.id.toString();
  if (!isUserApproved(userId)) {
    await ctx.answerCallbackQuery("Not authorized");
    return;
  }

  const [action, shortId] = callbackQuery.data.split(":");

  if (action !== "approve" && action !== "deny" && action !== "always") return;

  const pending = getPendingPermissionByLocalId(shortId);
  if (!pending) {
    await ctx.answerCallbackQuery("Permission request not found or expired");
    return;
  }

  try {
    await replyPermission(
      pending.opencode_session_id,
      pending.opencode_permission_id,
      action as "once" | "always" | "reject"
    );

    updatePermissionStatus(
      pending.id,
      action === "deny" ? "denied" : "approved"
    );

    const statusText = action === "deny" ? "❌ Denied"
      : action === "always" ? "✅ Always approved"
      : "✅ Approved";

    await ctx.answerCallbackQuery(statusText);

    if (callbackQuery.message) {
      await ctx.api.editMessageText(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        `⚠️ *Permission Request*\n\n` +
          `Status: ${statusText}`,
        { parse_mode: "Markdown" }
      );
    }

    logger.info(
      { telegramId: userId, permissionId: pending.opencode_permission_id, action },
      "Permission replied via inline keyboard"
    );
  } catch (err) {
    logger.error({ err }, "Failed to process permission callback");
    await ctx.answerCallbackQuery("Failed to process");
  }
}

export async function promptPermission(
  telegramId: string,
  chatId: number,
  sessionId: string,
  permissionId: string,
  actionType: string,
  actionDetail?: string
): Promise<void> {
  const pending = createPendingPermission(
    telegramId,
    sessionId,
    permissionId,
    actionType,
    actionDetail
  );

  const { bot } = await import("../index.js");

  const autoApprove = getAutoApprove(telegramId);

  if (autoApprove) {
    try {
      await replyPermission(sessionId, permissionId, "always");
      updatePermissionStatus(pending.id, "approved");
      logger.info({ telegramId, permissionId }, "Auto-approved permission");
      return;
    } catch (err) {
      logger.error({ err }, "Failed to auto-approve");
    }
  }

  const shortId = pending.id.slice(0, 8);
  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${shortId}`)
    .text("❌ Deny", `deny:${shortId}`)
    .row()
    .text("✅ Always Approve", `always:${shortId}`);

  const message = await bot?.api.sendMessage(
    chatId,
    `⚠️ *Permission Request*\n\n` +
      `Action: \`${actionType}\`\n` +
      (actionDetail
        ? `Detail: \`\`\`\n${actionDetail.slice(0, 500)}\n\`\`\`\n`
        : ""),
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );

  if (message) {
    const { setPermissionTelegramMessageId } = await import(
      "../../store/permissions.js"
    );
    setPermissionTelegramMessageId(pending.id, message.message_id);
  }

  logger.info(
    { telegramId, permissionId, actionType },
    "Prompted for permission"
  );
}
