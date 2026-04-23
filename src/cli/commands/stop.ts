import { Command } from "commander";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const PID_FILE = "/tmp/gateway.pid";

export const stopCommand = new Command("stop")
  .description("Stop the gateway daemon")
  .option("-f, --force", "Force kill if graceful stop fails", false)
  .action((options) => {
    if (!existsSync(PID_FILE)) {
      console.log("Gateway is not running (no PID file found)");
      return;
    }

    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);

    if (isNaN(pid)) {
      console.log("Invalid PID file, removing...");
      unlinkSync(PID_FILE);
      return;
    }

    try {
      process.kill(pid, 0);
    } catch {
      console.log("Gateway is not running (stale PID file)");
      unlinkSync(PID_FILE);
      return;
    }

    try {
      console.log(`Stopping gateway (PID ${pid})...`);
      process.kill(pid, options.force ? "SIGKILL" : "SIGTERM");

      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        try {
          process.kill(pid, 0);
          attempts++;
          setTimeout(() => {}, 500);
        } catch {
          break;
        }
      }

      if (attempts === maxAttempts && options.force === false) {
        console.log("Process didn't stop gracefully, use --force to kill");
        return;
      }

      if (attempts === maxAttempts) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }

      unlinkSync(PID_FILE);
      console.log("✅ Gateway stopped");
    } catch (err) {
      console.error("Failed to stop gateway:", err);
    }
  });
