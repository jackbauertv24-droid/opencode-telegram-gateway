import { Bot } from "grammy";
import { handleMessage } from "./message.js";
import { handlePermissionCallback } from "./permission.js";
import { handleModelsCallback } from "../commands/models.js";

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

  bot.callbackQuery(/^approve:/, handlePermissionCallback);
  bot.callbackQuery(/^deny:/, handlePermissionCallback);
  bot.callbackQuery(/^always:/, handlePermissionCallback);
  bot.callbackQuery(/^models:/, handleModelsCallback);
}
