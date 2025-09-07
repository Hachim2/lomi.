import Conf from "conf";
import chalk from "chalk";

// Define and export the expected structure of your config data
export interface ConfigData {
  projectName?: string;
  apiKey?: string; // For project-specific API key used by the application
  cliToken?: string; // For the developer-specific token obtained via `lomi login`
  environment?: "production" | "sandbox";
  language?: "TypeScript" | "JavaScript";
  supabaseUrl?: string; // Optional: Store the Supabase URL used for login
  // Add other fields as needed
}

// Define the schema for type validation (optional but recommended)
const schema: Record<keyof ConfigData, any> = {
  projectName: { type: "string" },
  apiKey: { type: "string" },
  cliToken: { type: "string" },
  environment: { type: "string", enum: ["production", "sandbox"] },
  language: { type: "string", enum: ["TypeScript", "JavaScript"] },
  supabaseUrl: { type: "string", format: "url" },
};

// Create a Conf instance
// Project name determines the config file location
// e.g., ~/.config/lomi-cli-nodejs/config.json
const config = new Conf<ConfigData>({
  projectName: "lomi-cli",
  // schema, // You can enable schema validation if needed
});

/**
 * Saves the configuration data.
 * Merges with existing data by default.
 * @param {Partial<ConfigData>} data - The configuration data to save.
 */
export function saveConfig(data: Partial<ConfigData>): void {
  // Type assertion needed as conf.set doesn't directly use the generic
  config.set(data as any);
}

/**
 * Loads the entire configuration object.
 * @returns {ConfigData | null} The configuration data, or null if not found/empty.
 */
export function loadConfig(): ConfigData | null {
  // Return the whole store. Returns an empty object if config file doesn't exist.
  const store = config.store;
  // Return null if the store is effectively empty
  return Object.keys(store).length > 0 ? store : null;
}

/**
 * Gets a specific configuration value.
 * @param {keyof ConfigData} key - The configuration key to retrieve.
 * @returns {T | undefined} The value or undefined if not set.
 */
export function getConfigValue<K extends keyof ConfigData>(
  key: K,
): ConfigData[K] | undefined {
  return config.get(key);
}

/**
 * Deletes a specific configuration key.
 * @param {keyof ConfigData} key - The key to delete.
 */
export function deleteConfigValue(key: keyof ConfigData): void {
  config.delete(key);
}

/**
 * Clears the entire configuration.
 */
export function clearConfig(): void {
  config.clear();
}

/**
 * Gets the path to the configuration file.
 * @returns {string} The absolute path to the config file.
 */
export function getConfigFilePath(): string {
  return config.path;
}

/**
 * Checks if the user is logged in (CLI token exists).
 * If not, prints an error message and exits the process.
 */
export function ensureLoggedIn(): void {
  const token = getConfigValue("cliToken");
  if (!token) {
    console.error(chalk.red("Error: You are not logged in."));
    console.log(`Please run ${chalk.bold("lomi. login")} first.`);
    process.exit(1);
  }
}

// Example of how to set a default value if needed
// config.set('defaultSetting', 'defaultValue');
