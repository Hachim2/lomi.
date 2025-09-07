import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import { saveConfig } from "../utils/config.js";
// Assuming verifyWebhookSignature and LomiWebhookEvent are exported by the main 'lomi.' package
// import type { LomiWebhookEvent } from 'lomi.';
// import { verifyWebhookSignature } from 'lomi.';

const command = new Command("init");

// ASCII Art from lomi.md
const lomiArtLines = `

██╗      ██████╗ ███╗   ███╗██╗
██║     ██╔═══██╗████╗ ████║██║
██║     ██║   ██║██╔████╔██║██║
██║     ██║   ██║██║╚██╔╝██║██║
███████╗╚██████╔╝██║ ╚═╝ ██║██║██╗
╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝
`
  .trim()
  .split("\n"); // Split into an array of lines

const getClientTemplate = (isTypeScript: boolean) => `\
${
  isTypeScript
    ? `import { DefaultService, OpenAPI } from '@lomi./sdk'; // Use the actual exported service`
    : `const { DefaultService, OpenAPI } = require('@lomi./sdk');`
}
${isTypeScript ? `import 'dotenv/config';` : `require('dotenv').config();`}

// Load API key and optional base URL from environment variables
const apiKey = process.env.LOMI_API_KEY;
const baseUrl = process.env.LOMI_API_URL || undefined; // OpenAPIConfig expects undefined, not empty string

if (!apiKey) {
  console.error('Error: LOMI_API_KEY not found in environment variables. Please check your .env file.');
  process.exit(1);
}

// Configure the OpenAPI client
OpenAPI.BASE = baseUrl || 'https://api.lomi.africa/v1'; // Set base URL if provided
OpenAPI.HEADERS = {
  'Authorization': \`Bearer ${process.env.LOMI_API_KEY || ''}\`,
};

// Instantiate the single service
${isTypeScript ? 'export const' : 'const'} lomiApi = DefaultService;

// Export the service instance (it's often used statically with configuration)
${isTypeScript ? 'export default lomiApi;' : 'module.exports = { lomiApi };'}
`;

const getCheckoutSessionTemplate = (isTypeScript: boolean) => {
  const fileExtension = isTypeScript ? "ts" : "js";
  return `\
${
  isTypeScript
    ? `import { lomiApi } from '../lib/lomi./client.${fileExtension}'; // Import the DefaultService instance
// Import specific types needed from the SDK if using TypeScript
import type { CreateCheckoutSession } from '@lomi./sdk';
import 'dotenv/config';`
    : `const { lomiApi } = require('../lib/lomi./client.${fileExtension}'); // Use dynamic extension
require('dotenv').config();`
}

async function createCheckout() {
  // API Key check is now handled in the client file
  console.log('Attempting to create a checkout session...');

  try {
    // Replace with actual product ID, merchant ID, and URLs
    // You might need to fetch your merchant ID dynamically or store it
    const merchantId = 'your_merchant_id'; // FIXME: Replace with your actual merchant ID
    const priceId = 'price_xxxxxxxxxxxx'; // FIXME: Replace with a price ID from your products
    const successUrl = 'https://your-site.com/success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = 'https://your-site.com/cancel';

    // Prepare the request body according to the SDK's expected type
    const payload${isTypeScript ? ': CreateCheckoutSession' : ''} = {
      merchant_id: merchantId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      // Add other necessary parameters like 'customer_email', 'metadata', etc.
      // Refer to SDK types or API documentation
    };

    // Use the method directly on the DefaultService instance
    // Method names are typically based on OpenAPI operation IDs
    const session = await lomiApi.createCheckoutSession(payload);

    console.log('Checkout Session Created:');
    console.log('ID:', session.id);
    console.log('URL:', session.url); // The URL to redirect the customer to
    console.log('Redirect your customer to the URL above to complete the payment.');

  } catch (error) {
    console.error('Error creating checkout session:');
    if (error instanceof Error) {
      console.error(error.message);
      // Log details from ApiError if available
      // if (error instanceof ApiError) { console.error('API Error Body:', error.body); }
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
}

createCheckout();
`;
};

const getWebhookHandlerTemplate = (isTypeScript: boolean) => {
  const fileExtension = isTypeScript ? "ts" : "js";
  return `\
${
  isTypeScript
    ? `import http from 'http';
import { Buffer } from 'node:buffer'; // Explicit import for Buffer
import crypto from 'node:crypto'; // Import crypto for signature verification
// Client import is not strictly needed here unless calling API based on webhook
// import { lomiApi } from '../lib/lomi./client.${fileExtension}';
import type { IncomingMessage, ServerResponse } from 'http';
// Import specific webhook event types if defined and exported by the SDK
// Example: import type { WebhookEvent } from '@lomi./sdk';
import 'dotenv/config';`
    : `const http = require('http');
const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');
// const { lomiApi } = require('../lib/lomi./client.${fileExtension}');
require('dotenv').config();`
}

const webhookSecret = process.env.LOMI_WEBHOOK_SECRET; // Get from dashboard

if (!webhookSecret) {
  console.error('Error: LOMI_WEBHOOK_SECRET not found in .env file.');
  console.log('Please add your webhook signing secret to the .env file.');
  process.exit(1);
}

// --- Webhook Signature Verification ---
// IMPORTANT: Implement signature verification based on lomi. docs.
// The following is a *generic* example using HMAC-SHA256.
// Replace with the exact algorithm and header format specified by lomi.
function verifyLomiSignature(rawBody${isTypeScript ? ': string' : ''}, signatureHeader${isTypeScript ? ': string' : ''}, secret${isTypeScript ? ': string' : ''})${isTypeScript ? ': Record<string, any>' : ''} {
  try {
    // Example: Extract timestamp and signature from header (adjust based on actual format)
    // e.g., Header: "lomi-signature: t=1678886400,s=sha256=abcdef..."
    const parts = signatureHeader.split(',');
    const timestampPart = parts.find(part => part.startsWith('t='));
    const signaturePart = parts.find(part => part.startsWith('s=')); // Adjust prefix 's=' if needed

    if (!timestampPart || !signaturePart) {
      throw new Error('Invalid signature header format');
    }

    const timestamp = timestampPart.split('=')[1];
    const signature = signaturePart.split('=')[1]; // Adjust based on actual signature value format

    // Optional: Check timestamp tolerance (e.g., within 5 minutes)
    const tolerance = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (Date.now() - parseInt(timestamp, 10) * 1000 > tolerance) {
      // Disabled for local testing, enable in production if needed
      // throw new Error('Timestamp outside tolerance');
    }

    // Construct the signed payload string (adjust based on lomi. docs)
    // Typically: timestamp + '.' + rawBody
    const signedPayload = \`\${timestamp}.\${rawBody}\`;

    // Calculate the expected signature
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(signedPayload).digest('hex');

    // Compare signatures securely (timing-attack resistant)
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      throw new Error('Signature mismatch');
    }

    // If verification passes, parse and return the event body
    return JSON.parse(rawBody);

  } catch (error) {
    console.error("Webhook verification failed:", error instanceof Error ? error.message : String(error));
    throw new Error('Webhook signature verification failed');
  }
}
// --- End Verification ---

const server = http.createServer(async (req${isTypeScript ? ': IncomingMessage' : ''}, res${isTypeScript ? ': ServerResponse' : ''}) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let rawBody = '';
    try {
      // Read the raw body
      const chunks${isTypeScript ? ': Buffer[]' : ''} = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      rawBody = Buffer.concat(chunks).toString('utf8');
      console.log('Received raw webhook body.');

      // Get the signature header
      const signature = req.headers['lomi-signature'] as string; // Adjust header name if needed
      if (!signature) {
        throw new Error('Missing webhook signature header');
      }

      // Verify the signature and parse the event
      const event = verifyLomiSignature(rawBody, signature, webhookSecret);
      console.log('Webhook Verified. Event Type:', event.type);

      // Handle the event (use type assertion if event type is imported)
      // const typedEvent = event as WebhookEvent;
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object; // Define type if possible in TS
          console.log(\`Checkout Session \${session.id} was successful!\`);
          // TODO: Fulfill the order, grant access, etc.
          break;
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object; // Define type if possible in TS
          console.log(\`PaymentIntent \${paymentIntent.id} succeeded.\`);
          // TODO: Handle successful payment
          break;
        // ... handle other relevant event types based on your API docs
        default:
          console.log(\`Unhandled event type: \${event.type}\`);
      }

      // Acknowledge receipt
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));

    } catch (err) {
      const message = (err instanceof Error) ? err.message : 'Unknown webhook processing error';
      console.error('Webhook Error:', message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: message })); // Send error in body for clarity
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 4242;
server.listen(PORT, () => console.log(\`Webhook server listening on http://localhost:\${PORT}/webhook\`));
console.log('Point your lomi. webhook endpoint configuration to this URL.');
console.log("Use 'lomi dev' or a tool like ngrok/localtunnel to expose this endpoint publicly during development.");
`;
};

const envTemplate = `# Your lomi. API Key (get it from https://lomi.africa/portal/settings/api-keys)
LOMI_API_KEY=your_api_key_here

# Your Webhook Signing Secret (get it from https://lomi.africa/portal/webhooks)
# Received after creating a webhook in the portal and used for verifying incoming webhook requests. Keep this secret!
LOMI_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# API URL (defaults to production)
# Use https://sandbox.api.lomi.africa/v1 for testing
LOMI_API_URL=https://api.lomi.africa/v1`;

command
  .description("Initialize a new lomi. project with example code")
  .action(async () => {
    // Add a blank line before the art
    console.log(); 
    // Display ASCII Art first, line by line
    lomiArtLines.forEach((line) => console.log(line));
    console.log(chalk.blue("\nWelcome to lomi.! Let's set up your project.\n")); // Add newline before welcome

    const answers = await inquirer.prompt([
      {
        type: "password", // Changed from 'input' to 'password'
        name: "apiKey",
        message: `Enter your ${chalk.yellow("API key")} (from https://lomi.africa/portal/settings/api-keys):`,
        mask: "*", // Optional: Define the mask character
        validate: (input: string) =>
          input.length > 0 || "API key cannot be empty",
      },
      {
        type: "list",
        name: "environment",
        message: "Which environment API should the examples use?",
        choices: [
          { name: "Production (live transactions)", value: "production" },
          { name: "Sandbox (for testing)", value: "sandbox" },
        ],
        default: "production",
      },
      {
        type: "list",
        name: "language",
        message: "Generate example code in:",
        choices: ["TypeScript", "JavaScript"],
        default: "TypeScript",
      },
    ]);

    const isTypeScript = answers.language === "TypeScript";
    const fileExtension = isTypeScript ? "ts" : "js";
    const spinner = ora("Setting up your lomi. project...").start();

    try {
      const projectDir = process.cwd();
      const projectName = projectDir.split("/").pop() || "lomi-project";

      // Save basic config (optional, could rely solely on .env)
      await saveConfig({
        projectName: projectName,
        apiKey: answers.apiKey, // Storing API key here might be less secure than just .env
        environment: answers.environment,
        language: answers.language,
      });
      spinner.text = "Creating directories...";
      // Create lib/lomi. and examples directories
      const clientLibDir = join(projectDir, "lib", "lomi."); // New nested directory
      const examplesDir = join(projectDir, "examples");
      await mkdir(clientLibDir, { recursive: true }); // Create nested dir
      await mkdir(examplesDir, { recursive: true });

      spinner.text = `Generating ${answers.language} files...`;
      // Create lib/lomi./client file
      const clientFilePath = join(clientLibDir, `client.${fileExtension}`); // Updated path
      await writeFile(clientFilePath, getClientTemplate(isTypeScript));

      // Create example files
      const checkoutExamplePath = join(
        examplesDir,
        `create-checkout-session.${fileExtension}`,
      );
      await writeFile(
        checkoutExamplePath,
        getCheckoutSessionTemplate(isTypeScript),
      );

      const webhookExamplePath = join(
        examplesDir,
        `webhook-handler.${fileExtension}`,
      );
      await writeFile(
        webhookExamplePath,
        getWebhookHandlerTemplate(isTypeScript),
      );

      // Create .env file
      spinner.text = "Creating .env file...";
      const envPath = join(projectDir, ".env");
      let envContent = envTemplate.replace("your_api_key_here", answers.apiKey);
      // Replace webhook secret placeholder - user still needs to manually add it
      // envContent = envContent.replace('whsec_your_webhook_secret_here', 'YOUR_SECRET_HERE'); // Maybe don't prompt for secret?
      if (answers.environment === "sandbox") {
        envContent = envContent.replace(
          "https://api.lomi.africa/v1",
          "https://sandbox.api.lomi.africa/v1",
        );
      }
      try {
        await writeFile(envPath, envContent, { flag: "wx" }); // wx prevents overwriting
        spinner.info(
          chalk.gray(
            "Created .env file. Remember to add your LOMI_WEBHOOK_SECRET.",
          ),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          spinner.warn(
            chalk.yellow(
              ".env file already exists. API key and URL not added automatically. Please update manually.",
            ),
          );
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Check for package.json before installing dependencies
      let canInstallDeps = true;
      try {
        await access(join(projectDir, "package.json"));
      } catch (error) {
        // package.json doesn't exist, try to create it
        spinner.stopAndPersist({
          symbol: chalk.yellow("!"),
          text: chalk.yellow("No `package.json` found."),
        });
        spinner.start("Running `pnpm init`...");
        try {
          execSync("pnpm init", { cwd: projectDir, stdio: "ignore" });
          spinner.succeed("`pnpm init` completed.");
          // Now we can proceed to install dependencies
          canInstallDeps = true;
        } catch (initError) {
          spinner.fail(chalk.red("Failed to run `pnpm init`."));
          console.error(
            chalk.yellow("Could not automatically initialize the project."),
          );
          console.warn(
            chalk.gray(
              "Please run `pnpm init` (or equivalent) in your project directory manually,",
            ),
          );
          console.warn(chalk.gray("and then run `pnpm add @lomi./sdk dotenv`."));
          canInstallDeps = false; // Ensure we don't try to install deps after init failure
        }
      }

      // Install dependencies if package.json exists (or was just created)
      if (canInstallDeps) {
        spinner.text = "Installing necessary dependencies (@lomi./sdk, dotenv)...";
        try {
          execSync("pnpm add @lomi./sdk dotenv");
          spinner.info("Installed dependencies: @lomi./sdk, dotenv");
        } catch (installError) {
          spinner.fail(chalk.red("Dependency installation failed."));
          console.error(chalk.yellow("Could not run `pnpm add @lomi./sdk dotenv`."));
          // Don't repeat the package.json advice here if canInstallDeps was true
          console.warn(
            chalk.gray("You may need to run `pnpm add @lomi./sdk dotenv` manually."),
          );
        }
      }

      spinner.succeed(chalk.green("lomi. project initialized successfully!"));

      console.log(chalk.bold("\nCreated the following files:"));
      console.log(
        chalk.cyan(`- lib/lomi./client.${fileExtension}`),
        "- lomi. client setup",
      ); // Updated path
      console.log(
        chalk.cyan(`- examples/create-checkout-session.${fileExtension}`),
        "- Example: Creating a Checkout Session",
      );
      console.log(
        chalk.cyan(`- examples/webhook-handler.${fileExtension}`),
        "- Example: Basic webhook handler server",
      );
      console.log(
        chalk.cyan("- .env"),
        `- Environment variables (API key ${answers.environment === "sandbox" ? "set to Sandbox URL" : "set to Production URL"})`,
      );
      console.log(
        chalk.yellow(
          "  -> Remember to add your LOMI_WEBHOOK_SECRET to the .env file!",
        ),
      );

      console.log(chalk.bold("\n🚀 Quick Start:"));
      console.log(
        chalk.blue("1."),
        `Fill in placeholder values (like ${chalk.yellow("your_merchant_id")}, ${chalk.yellow("price_xxx")}) in the example files.`,
      );
      console.log(
        chalk.blue("2."),
        `Add your webhook secret to the ${chalk.yellow(".env")} file.`,
      );
      console.log(chalk.blue("3."), "Run the examples:");
      if (isTypeScript) {
        console.log(
          chalk.gray(
            "  (Ensure you have ts-node installed: pnpm add -g ts-node)",
          ),
        );
        console.log(
          `   ${chalk.green("ts-node")} examples/create-checkout-session.ts`,
        );
        console.log(`   ${chalk.green("ts-node")} examples/webhook-handler.ts`);
      } else {
        console.log(
          `   ${chalk.green("node")} examples/create-checkout-session.js`,
        );
        console.log(`   ${chalk.green("node")} examples/webhook-handler.js`);
      }
      console.log(
        chalk.blue("4."),
        `For local webhook testing, use ${chalk.green("lomi dev")} or a tool like ngrok/localtunnel to expose the webhook handler.`,
      );
      console.log(
        "\n📚 Documentation:",
        chalk.blueBright("https://docs.lomi.africa"),
      ); // Update if needed
    } catch (error) {
      spinner.fail("Failed to initialize project");
      console.error(
        chalk.red(
          error instanceof Error ? error.message : "An unknown error occurred",
        ),
      );
      process.exit(1);
    }
  });

export default command;
