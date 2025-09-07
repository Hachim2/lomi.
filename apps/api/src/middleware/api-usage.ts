import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// Extend the Express Request type declaration from auth.ts
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      merchantId?: string;
      apiEnvironment?: "test" | "live";
    }
  }
}

/**
 * Middleware to track API usage and response times
 * This should be applied after authentication middleware
 */
export const trackApiUsage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip tracking for non-API routes or if no organization ID is set
  if (!req.path.startsWith("/v1") || !req.organizationId) {
    return next();
  }

  // Store organization ID securely (we already checked it's not undefined above)
  const organizationId = req.organizationId as string;

  // Store the start time
  const startTime = process.hrtime();

  // Store original end method
  const originalEnd = res.end;

  // Override end method to capture response time and status
  // @ts-ignore - TypeScript doesn't understand the override correctly
  res.end = function (chunk: any, encoding: BufferEncoding, cb?: () => void) {
    // Calculate response time in milliseconds
    const hrTime = process.hrtime(startTime);
    const responseTimeMs = Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000);

    // Get API key from request
    const apiKey = req.headers["x-api-key"] as string;

    // Only track if we have an API key
    if (apiKey) {
      // Get endpoint path (normalize by removing query params and IDs)
      const endpoint = normalizeEndpoint(req.path);

      // Log the API usage asynchronously (don't block response)
      logApiUsage(
        organizationId,
        apiKey,
        endpoint,
        req.method,
        res.statusCode,
        responseTimeMs,
        req.ip || "",
      ).catch((err) => {
        console.error("Failed to log API usage:", err);
      });
    }

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Helper function to normalize endpoint paths by removing IDs
 * e.g., /v1/customers/123 -> /v1/customers/:id
 */
function normalizeEndpoint(path: string): string {
  // Replace UUIDs and numeric IDs with :id placeholder
  return path
    .replace(/\/[a-f0-9-]{36}(?=\/|$)/g, "/:id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

/**
 * Log API usage to the database
 */
async function logApiUsage(
  organizationId: string,
  apiKey: string,
  endpoint: string,
  method: string,
  status: number,
  responseTime: number,
  ipAddress: string,
): Promise<void> {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials missing");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Call the RPC function to log API usage
    await supabase.rpc("log_api_usage", {
      p_organization_id: organizationId,
      p_api_key: apiKey,
      p_endpoint: endpoint,
      p_request_method: method,
      p_response_status: status,
      p_response_time: responseTime,
      p_ip_address: ipAddress,
    });
  } catch (error) {
    console.error("Failed to log API usage to database:", error);
  }
}
