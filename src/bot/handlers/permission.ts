import { Context } from "grammy";
import { isUserApproved, getAutoApprove } from "../../store/users.js";
import {
  createPendingPermission,
  getPendingPermissionsForUser,
  updatePermissionStatus,
} from "../../store/permissions.js";
import { replyPermission } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handlePermissionReply(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();
  const text = ctx.message?.text?.toLowerCase();

  if (!userId || !isUserApproved(userId)) return;

  const pending = getPendingPermissionsForUser(userId);
  if (pending.length === 0) return;

  const latestPermission = pending[0];

  const approved = text === "yes" || text === "y";

  try {
    await replyPermission(
      latestPermission.opencode_session_id,
      latestPermission.opencode_permission_id,
      approved ? "once" : "reject"
    );

    updatePermissionStatus(
      latestPermission.id,
      approved ? "approved" : "denied"
    );

    await ctx.reply(approved ? "✅ Approved" : "❌ Denied");

    logger.info(
      {
        telegramId: userId,
        permissionId: latestPermission.id,
        approved,
      },
      "Permission replied"
    );
  } catch (err) {
    logger.error({ err }, "Failed to send permission reply");
    await ctx.reply("Failed to process permission reply.");
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

  const message = await bot?.api.sendMessage(
    chatId,
    `⚠️ *Permission Request*\n\n` +
      `Action: \`${actionType}\`\n` +
      (actionDetail
        ? `Detail: \`\`\`\n${actionDetail.slice(0, 500)}\n\`\`\`\n`
        : "") +
      `\nReply YES to approve, NO to deny.`,
    { parse_mode: "Markdown" }
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
