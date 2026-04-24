import { Context, InlineKeyboard } from "grammy";
import { isUserApproved, getAutoApprove } from "../../store/users.js";
import {
  createPendingPermission,
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

  const [action, pendingId, sessionId, permissionId] = callbackQuery.data.split(":");
  
  if (action !== "approve" && action !== "deny" && action !== "always") return;

  try {
    await replyPermission(
      sessionId,
      permissionId,
      action as "once" | "always" | "reject"
    );

    updatePermissionStatus(
      pendingId,
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
      { telegramId: userId, permissionId, action },
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

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${pending.id}:${sessionId}:${permissionId}`)
    .text("❌ Deny", `deny:${pending.id}:${sessionId}:${permissionId}`)
    .row()
    .text("✅ Always Approve", `always:${pending.id}:${sessionId}:${permissionId}`);

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
