# lomi. CLI

Command line interface for interacting with the lomi. payment platform.

## Installation

```bash
npm install -g lomi.cli
# or
pnpm add -g lomi.cli
```

## Commands

### `lomi. login`

Authenticates the CLI with your lomi. account via a browser flow.

**Usage:**

```bash
lomi. login
```

**Process:**
1.  Initiates device authorization flow.
2.  Prompts you to copy a `user_code`.
3.  Opens a browser to a `verification_uri` for you to paste the code and authorize.
4.  Polls for completion and saves the received `cliToken` globally.

This token authenticates subsequent `lomi.` commands.

### `lomi. init`

Initializes a new project in the current directory.

**Usage:**

```bash
lomi. init
```

**Process:**
1.  Prompts for your API key, target environment (Production/Sandbox), and language (TS/JS).
2.  Creates:
    *   `lib/lomi./client.(ts|js)`: SDK client setup.
    *   `examples/create-checkout-session.(ts|js)`: Checkout Session creation example.
    *   `examples/webhook-handler.(ts|js)`: Basic webhook handler example.
    *   `.env`: Stores `LOMI_API_KEY` and `LOMI_WEBHOOK_SECRET` placeholder.
3.  Runs `pnpm init` if no `package.json` exists.
4.  Installs `@lomi./sdk` and `dotenv` dependencies (`pnpm add`).

**Note:** Add your actual `LOMI_WEBHOOK_SECRET` to the `.env` file.

### `lomi. status`

Checks login status and API connectivity.

**Usage:**

```bash
lomi. status
```

**Process:**
1.  Verifies login status (requires prior `lomi. login`).
2.  Checks if the globally stored `cliToken` exists.
3.  Tests connection to the lomi. API `/health` endpoint.
4.  Reports success or failure for both token and connection checks.