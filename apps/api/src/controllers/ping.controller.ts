import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Error codes
enum ErrorCode {
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Standardized error response creator
function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: any,
) {
  return {
    error: {
      status,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

// Consistent error logging
function logError(error: any, context: string, req: Request) {
  console.error(`Error in ${context}:`, {
    error: error.message || error,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
}

/**
 * Ping the API
 * Calls the simple 'ping_api' Supabase function.
 */
export const pingApi = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc("ping_api");

    if (error) {
      logError(error, "pingApi database call", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to ping API via database",
            error.message,
          ),
        );
    }

    // Check if data is null or not the expected 'pong'
    if (data !== "pong") {
      logError(
        `Unexpected response from ping_api: ${data}`,
        "pingApi response check",
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Unexpected response from health check function",
            `Expected 'pong', received: ${data}`,
          ),
        );
    }

    // Send the successful 'pong' response
    res.json({
      message: data, // Should be 'pong'
    });
  } catch (error: any) {
    logError(error, "pingApi", req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "Internal server error during ping",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};
