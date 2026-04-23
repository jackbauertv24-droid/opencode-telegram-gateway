import { spawn, ChildProcess } from "child_process";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { healthCheck } from "../opencode/client.js";

let opencodeProcess: ChildProcess | null = null;

export async function ensureOpenCodeServe(): Promise<boolean> {
  const isRunning = await healthCheck();
  if (isRunning) {
    logger.info("OpenCode serve is already running");
    return true;
  }

  if (!config.opencodeServeAutoStart) {
    logger.error(
      "OpenCode serve is not running and auto-start is disabled"
    );
    return false;
  }

  return await startOpenCodeServe();
}

export async function startOpenCodeServe(): Promise<boolean> {
  if (opencodeProcess) {
    logger.warn("OpenCode serve process already exists");
    return true;
  }

  const url = new URL(config.opencodeServeUrl);
  const port = url.port || "4096";

  logger.info({ port }, "Starting OpenCode serve...");

  return new Promise((resolve) => {
    opencodeProcess = spawn(
      "opencode",
      ["serve", "--port", port, "--hostname", url.hostname || "127.0.0.1"],
      {
        cwd: config.opencodeWorkingDir,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logger.error("OpenCode serve startup timeout");
        resolve(false);
      }
    }, 30000);

    opencodeProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      logger.debug({ output }, "OpenCode stdout");

      if (!resolved && output.includes("listening on")) {
        clearTimeout(timeout);
        resolved = true;
        logger.info("OpenCode serve started successfully");
        resolve(true);
      }
    });

    opencodeProcess.stderr?.on("data", (data: Buffer) => {
      logger.debug({ output: data.toString() }, "OpenCode stderr");
    });

    opencodeProcess.on("error", (err) => {
      logger.error({ err }, "OpenCode serve process error");
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve(false);
      }
    });

    opencodeProcess.on("exit", (code, signal) => {
      logger.info({ code, signal }, "OpenCode serve exited");
      opencodeProcess = null;
    });
  });
}

export function stopOpenCodeServe(): void {
  if (opencodeProcess) {
    logger.info("Stopping OpenCode serve...");
    opencodeProcess.kill("SIGTERM");
    opencodeProcess = null;
  }
}

export function isOpenCodeServeRunning(): boolean {
  return opencodeProcess !== null;
}
