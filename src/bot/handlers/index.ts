import { Bot } from "grammy";
import { handleMessage } from "./message.js";
import { handlePermissionReply } from "./permission.js";

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

  bot.hears(["yes", "Yes", "YES", "y", "Y"], handlePermissionReply);
  bot.hears(["no", "No", "NO", "n", "N"], handlePermissionReply);
}
