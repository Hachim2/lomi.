// apps/cli/src/commands/login.ts
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import axios from "axios"; // Or use node-fetch if preferred
// Import loadConfig to potentially retrieve existing API key if needed
import {
  saveConfig,
  loadConfig,
  getConfigFilePath,
  type ConfigData,
} from "../utils/config.js";
import readline from "readline";

const command = new Command("login");

// Hardcode the specific Supabase project URL hosting the cli-auth function
const LOMI_SUPABASE_URL = "https://mdswvokxrnfggrujsfjd.supabase.co";

// Helper function for polling delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to wait for Enter key
function waitForEnter(query: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve();
    }),
  );
}

command
  .description(
    "Log in to lomi. via browser authentication to obtain a CLI Token",
  )
  .action(async () => {
    let spinner = ora("Initiating login...").start();

    // Use the hardcoded URL
    const supabaseUrl = LOMI_SUPABASE_URL;

    // Basic check to ensure the constant is set (should always be true)
    if (!supabaseUrl) {
      spinner.fail(
        chalk.red("Internal CLI Error: Authentication URL is not configured."),
      );
      console.error("Please contact Lomi support.");
      process.exit(1);
    }

    // Construct the base URL for the Edge Function
    const functionBaseUrl = `${supabaseUrl}/functions/v1/cli-auth`;

    try {
      // 1. Initiate Device Auth Flow
      spinner.text = "Requesting device code..."; // Update spinner text
      const deviceAuthUrl = `${functionBaseUrl}/device-auth`;
      const { data: deviceAuthData } = await axios.post(deviceAuthUrl);

      const { device_code, user_code, verification_uri, interval, expires_in } =
        deviceAuthData;

      spinner.succeed("Login initiated.");
      console.log(
        `\n${chalk.bold("Action Required to complete authentication:")}\n`,
      );
      console.log(`1. Copy this code: ${chalk.bold.yellow(user_code)}\n`);
      console.log(`2. Press enter to open your browser\n`);
      console.log(`3. Paste the code when prompted on the webpage.\n`);
      console.log(
        `${chalk.yellow("IMPORTANT:")} After signing in, you might be redirected elsewhere (e.g., your merchant dashboard).`,
      );
      console.log(
        `If this happens, please manually navigate back to the verification URL shown when you pressed ${chalk.bold("Enter")}:`,
      );
      console.log(`${chalk.cyan(verification_uri)}\n`);

      // --- Wait for user confirmation before opening ---
      await waitForEnter(
        chalk.gray(
          `\nPress ${chalk.bold("Enter")} to open the browser and continue...`,
        ),
      );
      // --- End Wait ---

      try {
        await open(verification_uri);
      } catch (err) {
        console.warn(
          chalk.yellow(`\nCould not automatically open the browser.`),
        );
        console.warn(
          chalk.yellow(
            `Please open this URL manually: ${chalk.cyan(verification_uri)}`,
          ),
        );
        console.error(
          chalk.red(
            err instanceof Error
              ? err.message
              : "Unknown error opening browser",
          ),
        );
      }

      // Add a message indicating waiting
      console.log(
        chalk.gray("\nWaiting for you to authorize in the browser..."),
      );

      // 3. Start Polling for Token
      spinner = ora("Waiting for authorization in browser...").start();
      const startTime = Date.now();
      const expiryTime = startTime + expires_in * 1000;
      const pollIntervalMs = interval * 1000;
      const tokenUrl = `${functionBaseUrl}/token`;

      let cliTokenValue: string | null = null;

      while (Date.now() < expiryTime) {
        await delay(pollIntervalMs);

        try {
          const { data: tokenData } = await axios.post(tokenUrl, {
            device_code,
          });
          // Success! API Key received (which we call CLI Token)
          cliTokenValue = tokenData.api_key;
          break; // Exit polling loop
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            const errorCode = error.response.data?.error;
            if (errorCode === "authorization_pending") {
              // Continue polling
              continue;
            } else if (errorCode === "expired_token") {
              spinner.fail(
                chalk.red("Login failed: The authorization code expired."),
              );
              console.log("Please run `lomi login` again.");
              process.exit(1);
            } else if (errorCode === "access_denied") {
              spinner.fail(
                chalk.red(
                  "Login failed: Authorization was denied in the browser.",
                ),
              );
              console.log(
                "Please run `lomi login` again if this was a mistake.",
              );
              process.exit(1);
            } else {
              // Other unexpected backend error during polling
              spinner.fail(
                chalk.red(
                  `Login failed: ${error.response.data?.message || "Unknown polling error"}`,
                ),
              );
              process.exit(1);
            }
          } else {
            // Network error or non-axios error during polling
            spinner.fail(
              chalk.red(
                "Login failed: Could not connect to authentication service.",
              ),
            );
            console.error(
              error instanceof Error ? error.message : "Unknown network error",
            );
            process.exit(1);
          }
        }
      }

      if (!cliTokenValue) {
        // This should only happen if the loop finishes due to expiry without explicit 'expired_token' error
        spinner.fail(
          chalk.red("Login failed: Timed out waiting for authorization."),
        );
        console.log("Please run `lomi login` again.");
        process.exit(1);
      }

      // 4. Save CLI Token to global config
      spinner.text = "Saving CLI Token...";
      let existingConfig: Partial<ConfigData> = {};
      try {
        const loaded = loadConfig(); // Returns ConfigData | null
        if (loaded) {
          existingConfig = loaded;
        }
      } catch (loadErr) {
        // If config file doesn't exist, that's okay, we'll create it.
        if (
          !(
            loadErr instanceof Error &&
            (loadErr as NodeJS.ErrnoException).code === "ENOENT"
          )
        ) {
          const message =
            loadErr instanceof Error
              ? loadErr.message
              : "Unknown config load error";
          console.warn(
            chalk.yellow(`Warning: Could not load existing config: ${message}`),
          );
        }
      }

      // Store the obtained token under a specific key, e.g., 'cliToken'
      // Keep other existing config values
      const newConfigData: Partial<ConfigData> = {
        ...existingConfig,
        cliToken: cliTokenValue,
      };

      // Ensure required fields are present if ConfigData demands them,
      // otherwise Partial<ConfigData> is fine.
      await saveConfig(newConfigData);

      spinner.succeed(
        chalk.green("Login successful! CLI Token saved globally."),
      );
      console.log("\nYou can now perform all lomi. CLI commands.");
      console.log(
        chalk.gray(
          "Run `lomi. init` in your terminal to set up project-specific API keys and get started.",
        ),
      );
    } catch (error) {
      // Error during initial /device-auth call or saving config
      spinner.fail("Login failed");
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          chalk.red(`Error: ${error.response.data?.message || error.message}`),
        );
      } else {
        console.error(
          chalk.red(
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
          ),
        );
      }
      process.exit(1);
    }
  });

export default command;
