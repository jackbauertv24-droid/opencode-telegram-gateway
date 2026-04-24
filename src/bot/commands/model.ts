import { Context, InlineKeyboard } from "grammy";
import { isUserApproved, getUserModel, setUserModel, clearUserModel } from "../../store/users.js";
import { getAvailableModels } from "../../opencode/client.js";
import { logger } from "../../logger.js";

export async function handleModel(ctx: Context): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId || !isUserApproved(userId)) {
    await ctx.reply("You are not authorized.");
    return;
  }

  const current = getUserModel(userId);

  try {
    const models = await getAvailableModels();

    if (models.length === 0) {
      await ctx.reply("No models available.");
      return;
    }

    const keyboard = new InlineKeyboard();

    for (const model of models) {
      const isCurrent = current && current.providerId === model.providerId && current.modelId === model.modelId;
      const label = isCurrent ? `✅ ${model.name}` : model.name;
      keyboard.text(label, `model:${model.providerId}:${model.modelId}`).row();
    }

    if (current) {
      keyboard.text("🔄 Reset to default", "model:reset:reset");
    }

    const currentText = current
      ? `\n\nCurrent: ${current.providerId}/${current.modelId}`
      : "\n\nCurrent: default";

    await ctx.reply(
      `🤖 *Select Model*${currentText}`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (err) {
    logger.error({ err }, "Failed to list models");
    await ctx.reply("❌ Failed to fetch available models.");
  }
}

export async function handleModelCallback(ctx: Context): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery?.data) return;

  const userId = callbackQuery.from.id.toString();
  if (!isUserApproved(userId)) {
    await ctx.answerCallbackQuery("Not authorized");
    return;
  }

  const parts = callbackQuery.data.split(":");
  const action = parts[1];
  const value = parts[2];

  if (action === "reset") {
    clearUserModel(userId);
    await ctx.answerCallbackQuery("✅ Reset to default model");

    if (callbackQuery.message) {
      await ctx.api.editMessageText(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        "🤖 *Model reset to default*",
        { parse_mode: "Markdown" }
      );
    }

    logger.info({ telegramId: userId }, "Model reset to default");
    return;
  }

  const providerId = action;
  const modelId = value;

  if (!providerId || !modelId) {
    await ctx.answerCallbackQuery("Invalid model selection");
    return;
  }

  setUserModel(userId, providerId, modelId);

  await ctx.answerCallbackQuery(`✅ Switched to ${modelId}`);

  if (callbackQuery.message) {
    await ctx.api.editMessageText(
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      `🤖 *Model switched*\n\nProvider: \`${providerId}\`\nModel: \`${modelId}\``,
      { parse_mode: "Markdown" }
    );
  }

  logger.info({ telegramId: userId, providerId, modelId }, "Model switched");
}
