import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SubscriptionStatus } from "../types/api";
import * as Types from "../types/api"; // Import generated types

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Error codes
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
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
  // Use req.merchantId if available from auth middleware
  const merchantId =
    (req as any).merchantId ||
    req.params?.merchant_id ||
    req.query?.merchant_id ||
    "N/A";
  console.error(`Error in ${context}:`, {
    error: error.message || error,
    stack: error.stack, // Include stack trace for better debugging
    path: req.path,
    method: req.method,
    ip: req.ip,
    merchantId: merchantId,
    requestBody: req.body, // Log request body for context
    requestParams: req.params, // Log path parameters
    requestQuery: req.query, // Log query parameters
  });
}

// Helper function to handle Supabase/PostgREST errors consistently
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
    case "22P02": // Invalid input syntax (e.g., bad UUID) - Treat as Not Found for get/update/delete
      status = 404;
      code = ErrorCode.NOT_FOUND;
      message = "Resource not found";
      break;
    case "23503": // Foreign key violation
      status = 409; // Conflict - Cannot delete/update due to related records
      code = ErrorCode.CONFLICT;
      message =
        "Operation violates foreign key constraint. Related records exist.";
      break;
    case "23505": // Unique violation
      status = 409;
      code = ErrorCode.CONFLICT;
      message = "Resource already exists or violates unique constraint";
      break;
    // Add more specific mappings as needed
  }

  return createErrorResponse(status, code, message, details);
}

// Utility for adding a small delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const FETCH_DELAY_MS = 300; // Delay in milliseconds before fetching after create/update

// Create customer subscription request validation schema
const createCustomerSubscriptionSchema = z.object({
  merchant_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  start_date: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

// Update customer subscription request validation schema
const updateCustomerSubscriptionSchema = z
  .object({
    status: z.nativeEnum(SubscriptionStatus).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    next_billing_date: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Common parameter schemas
const subscriptionIdParamSchema = z.object({
  subscription_id: z.string().uuid("Invalid Subscription ID format"),
});
const merchantIdQuerySchema = z.object({
  merchant_id: z.string().uuid("Invalid Merchant ID format"),
});
/**
 * List customer subscriptions
 */
export const listCustomerSubscriptions = async (
  req: Request,
  res: Response,
) => {
  const context = "listCustomerSubscriptions";
  try {
    // Validate merchant_id parameter
    const merchantValidation = merchantIdQuerySchema.safeParse(req.query);
    if (!merchantValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid or missing merchant_id",
            merchantValidation.error.format(),
          ),
        );
    }

    const { merchant_id } = merchantValidation.data;
    const customer_id = req.query.customer_id as string | undefined;
    const status = req.query.status as SubscriptionStatus | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(
      `Listing subscriptions for merchant ${merchant_id}, customer ${customer_id}, status ${status}`,
    );

    // Call the RPC function to list customer subscriptions
    const { data, error } = await supabase.rpc("list_customer_subscriptions", {
      p_merchant_id: merchant_id,
      p_customer_id: customer_id || null,
      p_status: status || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error(`${context} - Error listing subscriptions:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      });
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    return res.status(200).json({
      success: true,
      data: data as Types.Subscription[],
      meta: {
        limit,
        offset,
        total_returned: (data || []).length,
      },
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Get subscription details
 */
export const getSubscription = async (req: Request, res: Response) => {
  const context = "getSubscription";
  try {
    // Validate subscription_id parameter
    const subscriptionValidation = subscriptionIdParamSchema.safeParse(
      req.params,
    );
    if (!subscriptionValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid subscription_id",
            subscriptionValidation.error.format(),
          ),
        );
    }

    // Validate merchant_id parameter
    const merchantValidation = merchantIdQuerySchema.safeParse(req.query);
    if (!merchantValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid or missing merchant_id",
            merchantValidation.error.format(),
          ),
        );
    }

    const { subscription_id } = subscriptionValidation.data;
    const { merchant_id } = merchantValidation.data;

    console.log(
      `Getting subscription ${subscription_id} for merchant ${merchant_id}`,
    );

    // Call the RPC function to get customer subscription details
    const { data, error } = await supabase.rpc("get_customer_subscription", {
      p_subscription_id: subscription_id,
      p_merchant_id: merchant_id,
    });

    if (error) {
      console.error(`${context} - Error getting subscription:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      });
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Subscription not found",
          ),
        );
    }

    return res.status(200).json({
      success: true,
      data: data[0] as Types.Subscription,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (req: Request, res: Response) => {
  const context = "updateSubscription";
  try {
    // Validate subscription_id parameter
    const subscriptionValidation = subscriptionIdParamSchema.safeParse(
      req.params,
    );
    if (!subscriptionValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid subscription_id",
            subscriptionValidation.error.format(),
          ),
        );
    }

    // Validate merchant_id parameter
    const merchantValidation = merchantIdQuerySchema.safeParse(req.query);
    if (!merchantValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid or missing merchant_id",
            merchantValidation.error.format(),
          ),
        );
    }

    const { subscription_id } = subscriptionValidation.data;
    const { merchant_id } = merchantValidation.data;

    // Validate request body
    const validationResult = updateCustomerSubscriptionSchema.safeParse(
      req.body,
    );
    if (!validationResult.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid request data",
            validationResult.error.format(),
          ),
        );
    }

    const updateData = validationResult.data;
    console.log(
      `Updating subscription ${subscription_id} for merchant ${merchant_id}`,
    );

    // Call the RPC function to update customer subscription
    const { data: updated, error: updateError } = await supabase.rpc(
      "update_customer_subscription",
      {
        p_subscription_id: subscription_id,
        p_merchant_id: merchant_id,
        p_status: updateData.status || null,
        p_start_date: updateData.start_date || null,
        p_end_date: updateData.end_date || null,
        p_next_billing_date: updateData.next_billing_date || null,
        p_metadata: updateData.metadata || null,
      },
    );

    if (updateError) {
      console.error(`${context} - Error updating subscription:`, {
        code: updateError.code,
        message: updateError.message,
        hint: updateError.hint,
        details: updateError.details,
      });
      return res
        .status(500)
        .json(handleDatabaseError(updateError, req, context));
    }

    if (!updated) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Subscription not found or update failed",
          ),
        );
    }

    // Add a small delay to ensure the subscription is fully updated
    await delay(FETCH_DELAY_MS);

    // Get the updated subscription details
    const { data: updatedSubscription, error: fetchError } = await supabase.rpc(
      "get_customer_subscription",
      {
        p_subscription_id: subscription_id,
        p_merchant_id: merchant_id,
      },
    );

    if (
      fetchError ||
      !updatedSubscription ||
      updatedSubscription.length === 0
    ) {
      const fetchErrorMessage =
        "Subscription updated but failed to retrieve details";
      logError(
        fetchError || new Error("get_customer_subscription returned no data"),
        `${context} - fetch after update`,
        req,
      );

      return res.status(200).json({
        success: true,
        message: fetchErrorMessage,
        data: {
          subscription_id: subscription_id,
          updated_fields: Object.keys(updateData),
          environment: process.env.NODE_ENV || "development",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedSubscription[0] as Types.Subscription,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  const context = "cancelSubscription";
  try {
    // Validate subscription_id parameter
    const subscriptionValidation = subscriptionIdParamSchema.safeParse(
      req.params,
    );
    if (!subscriptionValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid subscription_id",
            subscriptionValidation.error.format(),
          ),
        );
    }

    // Validate merchant_id parameter
    const merchantValidation = merchantIdQuerySchema.safeParse(req.query);
    if (!merchantValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid or missing merchant_id",
            merchantValidation.error.format(),
          ),
        );
    }

    const { subscription_id } = subscriptionValidation.data;
    const { merchant_id } = merchantValidation.data;

    console.log(
      `Cancelling subscription ${subscription_id} for merchant ${merchant_id}`,
    );

    // Call the RPC function to cancel customer subscription
    const { data: cancelled, error: cancelError } = await supabase.rpc(
      "cancel_customer_subscription",
      {
        p_subscription_id: subscription_id,
        p_merchant_id: merchant_id,
      },
    );

    if (cancelError) {
      console.error(`${context} - Error cancelling subscription:`, {
        code: cancelError.code,
        message: cancelError.message,
        hint: cancelError.hint,
        details: cancelError.details,
      });
      return res
        .status(500)
        .json(handleDatabaseError(cancelError, req, context));
    }

    if (!cancelled) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Subscription not found or cancellation failed",
          ),
        );
    }

    // Add a small delay to ensure the subscription is fully cancelled
    await delay(FETCH_DELAY_MS);

    // Get the updated subscription details
    const { data: updatedSubscription, error: fetchError } = await supabase.rpc(
      "get_customer_subscription",
      {
        p_subscription_id: subscription_id,
        p_merchant_id: merchant_id,
      },
    );

    if (
      fetchError ||
      !updatedSubscription ||
      updatedSubscription.length === 0
    ) {
      const fetchErrorMessage =
        "Subscription cancelled but failed to retrieve details";
      logError(
        fetchError || new Error("get_customer_subscription returned no data"),
        `${context} - fetch after cancel`,
        req,
      );

      return res.status(200).json({
        success: true,
        message: fetchErrorMessage,
        data: {
          subscription_id: subscription_id,
          status: "cancelled",
          environment: process.env.NODE_ENV || "development",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedSubscription[0] as Types.Subscription,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};
