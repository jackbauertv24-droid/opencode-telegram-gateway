#!/usr/bin/env node
import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { usersCommand } from "./commands/users.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("gateway")
  .description("OpenCode Telegram Gateway CLI")
  .version("0.1.0");

program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(usersCommand);
program.addCommand(statusCommand);

program.parse();
