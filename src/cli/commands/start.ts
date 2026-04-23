import { Command } from "commander";
import { spawn } from "child_process";
import { config, ensureDataDir } from "../../config.js";
import { logger } from "../../logger.js";

export const startCommand = new Command("start")
  .description("Start the gateway")
  .option("-d, --daemon", "Run as daemon (background)", false)
  .action(async (options) => {
    ensureDataDir();

    if (options.daemon) {
      console.log("Starting gateway as daemon...");
      const child = spawn(
        "npx",
        ["tsx", "src/index.ts"],
        {
          detached: true,
          stdio: "ignore",
          cwd: process.cwd(),
        }
      );
      child.unref();
      console.log("Gateway started in background");
      console.log(`PID: ${child.pid}`);
      return;
    }

    await import("../../index.js");
  });
