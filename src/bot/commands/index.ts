import { Bot, Context } from "grammy";
import { handleStart } from "./start.js";
import { handleNew } from "./new.js";
import { handleSessions } from "./sessions.js";
import { handleSwitch } from "./switch.js";
import { handleDelete } from "./delete.js";
import { handleStatus } from "./status.js";
import { handleResend } from "./resend.js";
import { handleApprove } from "./approve.js";
import { handleCancel } from "./cancel.js";
import { handleHelp } from "./help.js";

export function registerCommands(bot: Bot): void {
  bot.command("start", handleStart);
  bot.command("new", handleNew);
  bot.command("sessions", handleSessions);
  bot.command("switch", handleSwitch);
  bot.command("delete", handleDelete);
  bot.command("status", handleStatus);
  bot.command("resend", handleResend);
  bot.command("approve", handleApprove);
  bot.command("cancel", handleCancel);
  bot.command("help", handleHelp);

  bot.on("message:text", async (ctx) => {
    if (ctx.message.text?.startsWith("/")) return;
    await ctx.reply(
      "Use one of the commands to interact with OpenCode.\n\n" +
        "Type /help to see available commands."
    );
  });
}
