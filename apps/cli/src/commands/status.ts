import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, ensureLoggedIn } from "../utils/config.js";
import { makeRequest } from "../utils/api.js";

const command = new Command("status");

command
  .description(
    "Check global login status and API connectivity.",
  )
  .action(async () => {
    ensureLoggedIn();
    const spinner = ora("Checking status...").start();

    let globalConfig;
    try {
      globalConfig = loadConfig();
      if (!globalConfig?.cliToken) {
        spinner.fail("Failed to retrieve stored CLI Token.");
        console.log(chalk.yellow("Please try running `lomi login` again."));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Failed to load global configuration.");
      console.error(
        chalk.red(
          error instanceof Error ? error.message : "Unknown config error",
        ),
      );
      process.exit(1);
    }

    try {
      spinner.text = "Checking API connection...";
      await makeRequest("/health", {
        method: "GET",
        verbose: false,
      });

      spinner.succeed("Connected to lomi. API");
      spinner.succeed("CLI Token found");

      console.log("\nYou are logged in and ready to perform lomi. commands.");

    } catch (error) {
      spinner.fail("Failed to connect to lomi. API");
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );

      console.log("\nTroubleshooting:");
      console.log(
        "1. Check your login status using:",
        chalk.blue("lomi login"),
      );
      console.log("2. Verify your internet connection.");
      console.log("3. Contact support if the issue persists.");

      process.exit(1);
    }
  });

export default command;
