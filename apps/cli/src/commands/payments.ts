import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { makeRequest } from "../utils/api.js";
import { ensureLoggedIn } from "../utils/config.js";

interface CreatePaymentLinkRequest {
  merchant_id: string;
  title: string;
  price: number;
  currency_code: "XOF" | "USD" | "EUR";
  link_type: "instant";
  is_active: boolean;
}

interface PaymentLink {
  url: string;
  title: string;
  price: number;
  currency_code: string;
}

const command = new Command("payments");

command.description("Manage payments (requires login)").action(() => {
  ensureLoggedIn();
  console.log(chalk.blue("Use subcommands: list, get"));
  command.outputHelp();
});

command
  .command("create")
  .description("Create a new payment link")
  .action(async () => {
    ensureLoggedIn();
    console.log(chalk.blue("\nCreate a new payment link\n"));

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
        name: "title",
        message: "Enter payment link title:",
        validate: (input: string) => input.length > 0 || "Title is required",
      },
      {
        type: "input",
        name: "amount",
        message: "Enter amount:",
        validate: (input: string) =>
          !isNaN(Number(input)) || "Amount must be a number",
      },
      {
        type: "list",
        name: "currency",
        message: "Select currency:",
        choices: ["XOF", "USD", "EUR"],
        default: "XOF",
      },
    ]);

    const spinner = ora("Creating payment link...").start();

    try {
      const requestBody: CreatePaymentLinkRequest = {
        merchant_id: answers.merchantId,
        title: answers.title,
        price: Number(answers.amount),
        currency_code: answers.currency as "XOF" | "USD" | "EUR",
        link_type: "instant",
        is_active: true,
      };

      const response = await makeRequest<PaymentLink>("/payment-links", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      spinner.succeed("Payment link created successfully!");

      console.log("\nPayment Link Details:");
      console.log("URL:", chalk.blue(response.url));
      console.log("Title:", response.title);
      console.log("Amount:", `${response.price} ${response.currency_code}`);

      console.log("\nShare this link with your customers to accept payments.");
    } catch (error) {
      spinner.fail("Failed to create payment link");
      console.error(
        chalk.red(error instanceof Error ? error.message : "Unknown error"),
      );
      process.exit(1);
    }
  });

const listCommand = new Command("list")
  .description("List recent payments")
  .option("-l, --limit <number>", "Number of payments to list", "10")
  .action(async (options) => {
    ensureLoggedIn();
    const spinner = ora("Fetching payments...").start();
    // ... rest of list action
  });

const getCommand = new Command("get")
  .description("Get details for a specific payment")
  .argument("<payment_id>", "The ID of the payment to retrieve")
  .action(async (paymentId) => {
    ensureLoggedIn();
    const spinner = ora(`Fetching payment ${paymentId}...`).start();
    // ... rest of get action
  });

export default command;
