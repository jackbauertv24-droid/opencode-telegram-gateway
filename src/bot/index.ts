import { Bot, Context, GrammyError, HttpError } from "grammy";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { registerCommands } from "./commands/index.js";
import { registerHandlers } from "./handlers/index.js";
import { authMiddleware } from "./middleware/auth.js";

export let bot: Bot;

export async function initBot(): Promise<Bot> {
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required. Set it in .env");
  }

  bot = new Bot(config.telegramBotToken);

  bot.use(authMiddleware);

  registerCommands(bot);
  registerHandlers(bot);

  bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(
      { error: err.error, update: ctx.update },
      "Bot error"
    );

    if (err.error instanceof GrammyError) {
      logger.error(
        { error: err.error.description, ok: err.error.ok },
        "Grammy error"
      );
    } else if (err.error instanceof HttpError) {
      logger.error({ error: err.error }, "HTTP error");
    }
  });

  const me = await bot.api.getMe();
  logger.info({ username: me.username, id: me.id }, "Bot initialized");

  return bot;
}

export async function startBot(): Promise<void> {
  await bot.start({
    onStart: (info) => {
      logger.info({ username: info.username }, "Bot started polling");
    },
    drop_pending_updates: true,
  });
}

export async function stopBot(): Promise<void> {
  await bot.stop();
  logger.info("Bot stopped");
}
