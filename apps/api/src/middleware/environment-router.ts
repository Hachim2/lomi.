import { Request, Response, NextFunction } from "express";

/**
 * Middleware to route test environment API requests to the sandbox API
 *
 * This middleware checks if the API key is a test key (starts with lomi_sk_test_)
 * and routes the request to the sandbox API if needed.
 *
 * To be used in production when both live and test environments are on different domains.
 */
export const routeTestRequests = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers["x-api-key"] as string;

  // Check if this is a test API key
  if (apiKey && apiKey.startsWith("lomi_sk_test_")) {
    // Get the current host and check if we need to redirect
    const host = req.headers.host || "";

    // Only redirect if we're on the live API (api.lomi.africa)
    if (host === "api.lomi.africa" || host.includes("api.lomi")) {
      // Construct the sandbox URL
      const protocol = req.protocol;
      const path = req.originalUrl;
      const sandboxHost = "sandbox.api.lomi.africa";

      // Redirect to the sandbox API
      const redirectUrl = `${protocol}://${sandboxHost}${path}`;

      // Provide a helpful error message
      return res.status(400).json({
        error: {
          message: "Test API keys must be used with the sandbox API",
          details: "Your request was made to the live API with a test API key",
          solution: `Please use ${redirectUrl} instead`,
        },
      });
    }
  }

  // Check if this is a live API key on sandbox
  if (apiKey && apiKey.startsWith("lomi_sk_live_")) {
    const host = req.headers.host || "";

    // Only warn if we're on the sandbox API
    if (host === "sandbox.api.lomi.africa" || host.includes("sandbox")) {
      // Log a warning but let the request proceed
      console.warn(`Warning: Live API key used on sandbox: ${req.originalUrl}`);

      // Add a warning header
      res.setHeader(
        "X-Environment-Warning",
        "Live API key used on sandbox environment",
      );
    }
  }

  next();
};

/**
 * Set the base URL based on the API key environment
 *
 * This middleware is for client SDKs that use 'auto' as baseURL
 * and need to determine the correct environment dynamically
 */
export const determineEnvironment = (apiKey: string): string => {
  // Check if this is a test API key
  if (apiKey && apiKey.startsWith("lomi_sk_test_")) {
    return "https://sandbox.api.lomi.africa/v1";
  }

  // Default to live environment
  return "https://api.lomi.africa/v1";
};
