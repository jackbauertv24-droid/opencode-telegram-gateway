import { Bot } from "grammy";
import { handleMessage } from "./message.js";
import { handlePermissionCallback } from "./permission.js";
import { logger } from "../../logger.js";

export function registerHandlers(bot: Bot): void {
  bot.on("message:text", async (ctx) => {
    if (ctx.message.text?.startsWith("/")) return;
    await handleMessage(ctx);
  });

  bot.on("message", async (ctx) => {
    if (!ctx.message.text) {
      await ctx.reply("Only text messages are supported. Send a text message.");
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    logger.info({ data: ctx.callbackQuery.data }, "Raw callback query received");
  });

  bot.callbackQuery(/^approve:/, handlePermissionCallback);
  bot.callbackQuery(/^deny:/, handlePermissionCallback);
  bot.callbackQuery(/^always:/, handlePermissionCallback);
}
