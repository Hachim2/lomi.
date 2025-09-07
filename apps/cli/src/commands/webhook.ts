import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { makeRequest } from "../utils/api.js";
import { WEBHOOK_EVENTS } from "../config/constants.js";
import { ensureLoggedIn } from "../utils/config.js";

interface Webhook {
  webhook_id: string;
  merchant_id: string;
  url: string;
  authorized_events: string[];
  is_active: boolean;
  verification_token: string;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

const command = new Command("webhook");

command.description("Manage webhook endpoints (requires login)").action(() => {
  ensureLoggedIn();
  console.log(chalk.blue("Use subcommands: register, list"));
  command.outputHelp();
});

command
  .command("register")
  .description("Register a new webhook endpoint")
  .action(async () => {
    ensureLoggedIn();
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "merchantId",
        message: "Enter your merchant ID:",
        validate: (input: string) =>
          input.length > 0 || "Merchant ID is required",
      },
      {
        type: "input",
        name: "url",
        message: "Enter the webhook URL:",
        validate: (input: string) => {
          try {
            new URL(input);
            return true;
          } catch {
            return "Please enter a valid URL";
          }
        },
      },
      {
        type: "checkbox",
        name: "authorizedEvents",
        message: "Select events to subscribe to:",
        choices: WEBHOOK_EVENTS,
        validate: (input: string[]) =>
          input.length > 0 || "Select at least one event",
      },
    ]);

    const spinner = ora("Registering webhook endpoint...").start();

    try {
      const webhook = await makeRequest<Webhook>("/webhooks", {
        method: "POST",
        body: JSON.stringify({
          merchant_id: answers.merchantId,
          url: answers.url,
          authorized_events: answers.authorizedEvents,
          is_active: true,
        }),
      });

      spinner.succeed("Webhook endpoint registered successfully!");
      console.log("\nWebhook details:");
      console.log(chalk.blue("Webhook ID:"), webhook.webhook_id);
      console.log(chalk.blue("URL:"), webhook.url);
      console.log(chalk.blue("Events:"), webhook.authorized_events.join(", "));
      console.log(
        chalk.blue("Verification Token:"),
        webhook.verification_token,
      );
    } catch (error) {
      spinner.fail("Failed to register webhook endpoint");
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

command
  .command("list")
  .description("List webhook endpoints")
  .requiredOption("-m, --merchant-id <id>", "Merchant ID")
  .action(async (options) => {
    ensureLoggedIn();
    const spinner = ora("Fetching webhook endpoints...").start();

    try {
      const webhooks = await makeRequest<Webhook[]>("/webhooks", {
        method: "GET",
        headers: {
          "X-Merchant-ID": options.merchantId,
        },
      });

      spinner.stop();

      if (webhooks.length === 0) {
        console.log(chalk.yellow("\nNo webhook endpoints found."));
        return;
      }

      console.log("\nWebhook endpoints:");
      webhooks.forEach((webhook) => {
        console.log("\n" + chalk.blue("Webhook ID:"), webhook.webhook_id);
        console.log(chalk.blue("URL:"), webhook.url);
        console.log(
          chalk.blue("Events:"),
          webhook.authorized_events.join(", "),
        );
        console.log(
          chalk.blue("Status:"),
          webhook.is_active ? "Active" : "Inactive",
        );
        console.log(
          chalk.blue("Last Triggered:"),
          webhook.last_triggered_at || "Never",
        );
      });
    } catch (error) {
      spinner.fail("Failed to fetch webhook endpoints");
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

export default command;
