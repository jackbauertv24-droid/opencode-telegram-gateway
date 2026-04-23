import { Command } from "commander";
import { config, ensureDataDir } from "../../config.js";
import { healthCheck } from "../../opencode/client.js";
import { listApprovedUsers } from "../../store/users.js";
import { listUserSessions } from "../../store/sessions.js";

export const statusCommand = new Command("status")
  .description("Show gateway status")
  .action(async () => {
    ensureDataDir();
    console.log("\n📊 OpenCode Telegram Gateway Status\n");

    console.log("Configuration:");
    console.log(`  OpenCode URL: ${config.opencodeServeUrl}`);
    console.log(`  Working Dir: ${config.opencodeWorkingDir}`);
    console.log(`  Database: ${config.databasePath}`);
    console.log(`  Auto-start OpenCode: ${config.opencodeServeAutoStart}`);

    console.log("\nOpenCode Serve:");
    const ocReady = await healthCheck();
    if (ocReady) {
      console.log("  Status: ✅ Running");
    } else {
      console.log("  Status: ❌ Not running");
    }

    console.log("\nTelegram Bot:");
    if (config.telegramBotToken) {
      console.log("  Token: ✅ Configured");
    } else {
      console.log("  Token: ❌ Not configured");
      console.log("  Set TELEGRAM_BOT_TOKEN in .env");
    }

    const users = listApprovedUsers();
    console.log(`\nApproved Users: ${users.length}`);

    let totalSessions = 0;
    for (const user of users) {
      const sessions = listUserSessions(user.telegram_id);
      totalSessions += sessions.length;
    }
    console.log(`Total Sessions: ${totalSessions}`);

    console.log("\nTo start the gateway:");
    console.log("  gateway start");
    console.log("\nTo add a user:");
    console.log("  gateway users add <telegram_id>");
  });
