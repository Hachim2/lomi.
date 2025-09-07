import { loadConfig, getConfigValue, type ConfigData } from "./config.js";
import { API_URLS } from "../config/constants.js";
import chalk from "chalk";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public message: string = `API Error ${status}: ${JSON.stringify(body)}`,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function makeRequest<T>(
  path: string,
  options: RequestInit & { verbose?: boolean } = {},
): Promise<T> {
  let config: ConfigData | null;
  let cliToken: string | undefined;

  try {
    config = loadConfig();
    cliToken = getConfigValue("cliToken");
  } catch (error) {
    console.error(chalk.red("Error loading configuration:"), error);
    throw new Error("Could not load CLI configuration.");
  }

  if (!cliToken) {
    console.error(chalk.red("CLI Token not found. You are not logged in."));
    console.log(`Please run ${chalk.blue("lomi. login")} to authenticate.`);
    throw new Error("CLI authentication token missing.");
  }

  const environment = config?.environment || "production";

  const baseUrl = API_URLS[environment as keyof typeof API_URLS];

  if (!baseUrl) {
    console.error(chalk.red(`Invalid environment configured: ${environment}`));
    throw new Error(`Invalid API environment setting: ${environment}`);
  }

  const url = new URL(path, baseUrl);
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-API-KEY", cliToken);

  const { verbose = true, ...fetchOptions } = options;

  let response;
  try {
    if (verbose) {
      console.log(
        chalk.dim(
          `[API] Making request to: ${url.toString()} with method ${fetchOptions.method || "GET"}`,
        ),
      );
    }
    response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
    });
  } catch (fetchError) {
    console.error(
      chalk.red(`Network error connecting to ${baseUrl}:`),
      fetchError,
    );
    throw new Error(
      `Failed to connect to the API endpoint. Check your network connection and the API status. Details: ${fetchError instanceof Error ? fetchError.message : "Unknown network error"}`,
    );
  }

  if (!response.ok) {
    let errorBody: any = null;
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      errorBody = await response.json();
      if (errorBody && typeof errorBody === "object") {
        if ("message" in errorBody) {
          errorMessage = `${response.status}: ${errorBody.message}`;
        } else if (
          "error" in errorBody &&
          typeof errorBody.error === "string"
        ) {
          errorMessage = `${response.status}: ${errorBody.error}`;
        } else if ("detail" in errorBody) {
          errorMessage = `${response.status}: ${errorBody.detail}`;
        } else {
          errorMessage = `${response.status}: ${JSON.stringify(errorBody)}`;
        }
      }
    } catch (parseError) {
      errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      console.warn(chalk.yellow("Could not parse error response body."));
    }
    throw new ApiError(response.status, errorBody, errorMessage);
  }

  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined as T;
  }

  try {
    return await response.json();
  } catch (jsonError) {
    console.error(
      chalk.red("Failed to parse successful API response as JSON."),
      jsonError,
    );
    throw new Error("Received an invalid response from the API.");
  }
}
