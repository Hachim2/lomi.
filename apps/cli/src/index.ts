#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { createRequire } from "module";

// Import commands statically
import initCommand from "./commands/init.js";
// import apiKeyCommand from './commands/api-key.js'; // Removed apiKeyCommand import
// import webhookCommand from './commands/webhook.js'; // Commented out webhookCommand import
import devCommand from "./commands/dev.js";
import loginCommand from "./commands/login.js";
import paymentsCommand from "./commands/payments.js"; // Assuming payments exists
import statusCommand from "./commands/status.js"; // Assuming status exists

// Helper to read JSON files in ES module scope
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();

program
  .name("lomi.")
  .description("CLI for lomi.'s payment infrastructure")
  .version(pkg.version);

// Register commands
program.addCommand(initCommand);
program.addCommand(loginCommand);
// program.addCommand(apiKeyCommand); // Removed apiKeyCommand registration
// program.addCommand(webhookCommand); // Commented out webhookCommand registration
program.addCommand(devCommand);
program.addCommand(paymentsCommand); // Assuming payments exists
program.addCommand(statusCommand); // Assuming status exists

// Error handling
program.on("command:*", () => {
  console.error(chalk.red("Invalid command"));
  console.log(`See ${chalk.blue("--help")} for a list of available commands.`);
  process.exit(1);
});

program.parse();
