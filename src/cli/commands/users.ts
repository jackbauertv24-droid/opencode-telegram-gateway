import { Command } from "commander";
import {
  listApprovedUsers,
  addApprovedUser,
  removeApprovedUser,
} from "../../store/users.js";
import { getDb } from "../../store/db.js";
import { ensureDataDir } from "../../config.js";

export const usersCommand = new Command("users")
  .description("Manage approved users");

usersCommand
  .command("list")
  .description("List all approved users")
  .action(() => {
    ensureDataDir();
    const users = listApprovedUsers();

    if (users.length === 0) {
      console.log("No approved users.");
      console.log("\nTo add a user:");
      console.log("  gateway users add <telegram_id> [display_name]");
      return;
    }

    console.log("\nApproved Users:\n");
    console.log("ID".padEnd(15), "Name".padEnd(20), "Auto-approve");
    console.log("-".repeat(50));

    for (const user of users) {
      const autoApprove = user.auto_approve ? "ON" : "OFF";
      console.log(
        user.telegram_id.padEnd(15),
        (user.display_name || "-").padEnd(20),
        autoApprove
      );
    }

    console.log(`\nTotal: ${users.length} user(s)`);
  });

usersCommand
  .command("add <telegram_id>")
  .description("Add an approved user")
  .argument("[display_name]", "Display name for the user")
  .action((telegramId, displayName) => {
    ensureDataDir();
    addApprovedUser(telegramId, displayName);
    console.log(`✅ Added user: ${telegramId}`);
    if (displayName) {
      console.log(`   Name: ${displayName}`);
    }
  });

usersCommand
  .command("remove <telegram_id>")
  .alias("rm")
  .description("Remove an approved user")
  .action((telegramId) => {
    ensureDataDir();
    removeApprovedUser(telegramId);
    console.log(`✅ Removed user: ${telegramId}`);
  });

usersCommand
  .command("approve <telegram_id>")
  .description("Approve a user (alias for add)")
  .argument("[display_name]", "Display name for the user")
  .action((telegramId, displayName) => {
    ensureDataDir();
    addApprovedUser(telegramId, displayName);
    console.log(`✅ Approved user: ${telegramId}`);
    console.log("\nThe user can now send /start to begin using the gateway.");
  });
