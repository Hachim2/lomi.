import { Command } from "commander";
import chalk from "chalk";
import { createServer } from "http";
import { DEFAULT_PORT } from "../config/constants.js";
import ora from "ora";
import { ensureLoggedIn } from "../utils/config.js";

const command = new Command("dev");

command
  .description("Start development server for webhook testing")
  .option(
    "-p, --port <number>",
    "Port to run the server on",
    DEFAULT_PORT.toString(),
  )
  .action(async (options) => {
    ensureLoggedIn();
    const spinner = ora("Starting development server...").start();
    const port = parseInt(options.port, 10);

    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];

      req.on("data", (chunk) => chunks.push(chunk));

      req.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        const timestamp = new Date().toISOString();
        const token = req.headers["x-webhook-token"];

        console.log("\n" + chalk.blue("Webhook received at:"), timestamp);
        console.log(chalk.blue("Method:"), req.method);
        console.log(chalk.blue("Path:"), req.url);
        console.log(chalk.blue("Headers:"));
        Object.entries(req.headers).forEach(([key, value]) => {
          console.log(`  ${chalk.cyan(key)}: ${value}`);
        });

        if (token) {
          console.log(chalk.blue("\nVerification Token:"), token);
        }

        try {
          const data = JSON.parse(body);
          console.log(chalk.blue("\nPayload:"));
          console.log(JSON.stringify(data, null, 2));
        } catch {
          console.log(chalk.blue("\nBody:"), body);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ received: true, timestamp }));
      });
    });

    server.listen(port, () => {
      console.log(
        chalk.green(`\nDevelopment server running at http://localhost:${port}`),
      );
      console.log("\nReady to receive webhook events. Press Ctrl+C to stop.\n");
    });

    process.on("SIGINT", () => {
      console.log(chalk.yellow("\nShutting down development server..."));
      server.close(() => {
        console.log(chalk.green("Server stopped."));
        process.exit(0);
      });
    });
  });

export default command;
