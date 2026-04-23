import { config, ensureDataDir } from "./config.js";
import { logger } from "./logger.js";
import { getDb, closeDb } from "./store/db.js";
import { ensureOpenCodeServe, stopOpenCodeServe } from "./process/opencode.js";
import { sseSubscriber } from "./opencode/sse.js";
import { initBot, startBot, stopBot } from "./bot/index.js";
import { setupSSERouting } from "./bot/handlers/sse-router.js";

async function main(): Promise<void> {
  logger.info("Starting OpenCode Telegram Gateway...");

  ensureDataDir();
  getDb();
  logger.info("Database initialized");

  const opencodeReady = await ensureOpenCodeServe();
  if (!opencodeReady) {
    logger.error(
      "Cannot connect to OpenCode serve. Exiting."
    );
    process.exit(1);
  }

  setupSSERouting();
  await sseSubscriber.start();
  logger.info("SSE subscriber started");

  await initBot();
  logger.info("Telegram bot initialized");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");

    sseSubscriber.stop();
    await stopBot();
    stopOpenCodeServe();
    closeDb();

    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await startBot();
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
