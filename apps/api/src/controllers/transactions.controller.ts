import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as Types from "../types/api"; // Import generated types

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Error codes (Consider moving to a shared location)
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Standardized error response creator (Consider moving to a shared location)
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

// Consistent error logging (Consider moving to a shared location)
function logError(error: any, context: string, req: Request) {
  const merchantId = req.merchantId || req.params?.id || "N/A";
  console.error(`Error in ${context}:`, {
    error: error.message || error,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    merchantId: merchantId,
    requestBody: req.body,
    requestParams: req.params,
    requestQuery: req.query,
  });
}

// Helper function to handle Supabase/PostgREST errors consistently (Consider moving to a shared location)
function handleDatabaseError(error: any, req: Request, context: string) {
  logError(error, context, req);

  let status = 500;
  let code = ErrorCode.DATABASE_ERROR;
  let message = "Database operation failed";
  let details: any = {
    db_code: error.code,
    db_message: error.message,
    db_hint: error.hint,
    db_details: error.details,
  };

  switch (error.code) {
    case "PGRST116": // Resource not found (PostgREST specific)
    case "22P02": // Invalid input syntax (e.g., bad UUID)
      status = 404;
      code = ErrorCode.NOT_FOUND;
      message = "Resource not found or invalid ID format";
      break;
    // Add more specific mappings as needed
  }

  return createErrorResponse(status, code, message, details);
}

// Validation schema for transaction ID path parameter
const transactionIdParamSchema = z.object({
  transaction_id: z.string().uuid("Invalid Transaction ID format"),
});

/**
 * List transactions for a merchant
 */
export const listTransactions = async (req: Request, res: Response) => {
  const context = "listTransactions";
  try {
    const merchantId = req.merchantId; // Provided by authenticateAPIKey middleware

    if (!merchantId) {
      // This safeguard remains important
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication failed: Merchant ID not found in request.",
          ),
        );
    }

    // Extract and validate query parameters
    const {
      status,
      provider,
      from_date,
      to_date,
      limit = "20", // Default limit
      page = "1", // Default page
    } = req.query;

    // Basic validation for limit and page (can be enhanced with Zod)
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (
      isNaN(pageNum) ||
      pageNum < 1 ||
      isNaN(limitNum) ||
      limitNum < 1 ||
      limitNum > 100
    ) {
      // Added upper limit for safety
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid pagination parameters (limit must be 1-100, page >= 1)",
          ),
        );
    }

    const offset = (pageNum - 1) * limitNum;

    // Prepare status array if provided
    let statusArray: Types.TransactionStatus[] | null = null;
    if (status) {
      // Basic validation for status enum could be added here
      statusArray = (status as string).split(",") as Types.TransactionStatus[];
    }

    // List transactions using RPC function
    const { data, error } = await supabase.rpc("list_transactions", {
      p_merchant_id: merchantId,
      p_status: statusArray,
      p_provider: (provider as string) || null,
      p_start_date: from_date
        ? new Date(from_date as string).toISOString() // Consider Zod date validation
        : null,
      p_end_date: to_date
        ? new Date(to_date as string).toISOString() // Consider Zod date validation
        : null,
      p_limit: limitNum,
      p_offset: offset,
    });

    if (error) {
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // Assuming the RPC function returns the correct shape matching Types.Transaction
    const transactions = data as Types.Transaction[];

    // Return the transactions list with pagination metadata
    res.json({
      success: true,
      data: transactions,
      meta: {
        current_page: pageNum,
        per_page: limitNum,
        // Note: The RPC function needs to return a total count for accurate pagination
        // total: data.length, // This is incorrect, needs total count from DB/RPC
      },
      environment: process.env.NODE_ENV === "production" ? "live" : "test",
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected internal server error occurred while listing transactions",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Get a transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response) => {
  const context = "getTransactionById";
  try {
    const merchantId = req.merchantId; // Provided by authenticateAPIKey middleware

    // Check if merchantId is present
    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication failed: Merchant ID not found in request.",
          ),
        );
    }

    // Validate transaction_id from path parameters
    const paramValidation = transactionIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Transaction ID in URL",
            paramValidation.error.format(),
          ),
        );
    }
    const { transaction_id: transactionId } = paramValidation.data;

    // Get transaction using RPC function
    const { data, error } = await supabase.rpc("get_transaction", {
      p_transaction_id: transactionId,
      p_merchant_id: merchantId, // Pass merchantId for authorization check in DB
    });

    if (error) {
      // Use the standardized handler for database errors
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // RPC function returns an array, check if it's empty
    if (!data || data.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Transaction not found or does not belong to this merchant",
          ),
        );
    }

    // Return transaction details (data is an array with one element)
    const transaction = data[0] as Types.Transaction; // Cast to the expected type
    res.status(200).json({
      success: true,
      data: transaction, // Return the full transaction object
      environment: process.env.NODE_ENV === "production" ? "live" : "test",
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected internal server error occurred while fetching the transaction",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};
