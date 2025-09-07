import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  BillingFrequency,
  CurrencyCode,
  FailedPaymentAction,
  FirstPaymentType,
} from "../types/api";
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
    (req as any).merchantId || req.params?.merchant_id || "N/A";
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
      // Example: Cannot delete plan because subscriptions exist.
      if (context === "deleteSubscriptionPlan") {
        message =
          "Cannot delete subscription plan: It is currently in use by active subscriptions.";
        details.hint =
          "Delete associated subscriptions first or deactivate the plan.";
      }
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

// --- Zod Schemas ---

// Corresponds to components.schemas.CreateSubscriptionPlan in spec.yaml
const createSubscriptionPlanSchema = z.object({
  // merchant_id: z.string().uuid(), // Removed: Using path parameter
  name: z.string().min(1, "Name cannot be empty"),
  description: z.string().nullish(), // Optional, allow null
  amount: z.number().positive("Amount must be positive"),
  currency_code: z.nativeEnum(CurrencyCode),
  billing_frequency: z.nativeEnum(BillingFrequency),
  failed_payment_action: z.nativeEnum(FailedPaymentAction).optional(),
  charge_day: z.number().min(1).max(31).nullish(), // Optional, allow null
  metadata: z.record(z.any()).optional(),
  // is_active is handled by the RPC default, not set via API create
  first_payment_type: z.nativeEnum(FirstPaymentType).optional(),
});

// Corresponds to PATCH /subscriptions/{plan_id} request body in spec.yaml
const updateSubscriptionPlanApiSchema = z
  .object({
    metadata: z.record(z.any()).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => data.is_active !== undefined || data.metadata !== undefined,
    {
      message:
        "At least one field (is_active or metadata) must be provided for update",
      path: ["body"], // Specify path for better error reporting
    },
  );

// Common parameter schemas
const planIdParamSchema = z.object({
  plan_id: z.string().uuid("Invalid Plan ID format"),
});
const merchantIdParamSchema = z.object({
  merchant_id: z.string().uuid("Invalid Merchant ID format"),
});
const listParamsSchema = merchantIdParamSchema.extend({
  limit: z.coerce.number().int().positive().min(1).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});
const merchantAndPlanParamsSchema =
  merchantIdParamSchema.merge(planIdParamSchema);

// --- Controller Functions ---

/**
 * Create a subscription plan
 * POST /merchants/{merchant_id}/subscriptions
 */
export const createSubscriptionPlan = async (req: Request, res: Response) => {
  const context = "createSubscriptionPlan";
  try {
    // 1. Validate path param
    const paramsValidation = merchantIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Merchant ID in URL",
            paramsValidation.error.format(),
          ),
        );
    }
    const { merchant_id } = paramsValidation.data;

    // 2. Validate request body
    const bodyValidation = createSubscriptionPlanSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid request body",
            bodyValidation.error.format(),
          ),
        );
    }
    const planData = bodyValidation.data;

    // 3. Get Organization ID
    const { data: organizationData, error: orgError } = await supabase.rpc(
      "get_merchant_organization_id",
      { p_merchant_id: merchant_id },
    );
    if (orgError) {
      return res
        .status(404)
        .json(
          handleDatabaseError(
            orgError,
            req,
            `${context} - get_merchant_organization_id`,
          ),
        );
    }
    if (!organizationData) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Organization not found for the provided Merchant ID",
          ),
        );
    }

    // 4. Call create_subscription_plan RPC
    const { data: planId, error: createError } = await supabase.rpc(
      "create_subscription_plan",
      {
        p_merchant_id: merchant_id,
        p_organization_id: organizationData,
        p_name: planData.name,
        p_description: planData.description,
        p_billing_frequency: planData.billing_frequency,
        p_amount: planData.amount,
        p_currency_code: planData.currency_code,
        p_failed_payment_action: planData.failed_payment_action,
        p_charge_day: planData.charge_day,
        p_metadata: planData.metadata,
        p_first_payment_type: planData.first_payment_type,
      },
    );
    if (createError) {
      return res
        .status(500)
        .json(
          handleDatabaseError(
            createError,
            req,
            `${context} - create_subscription_plan RPC`,
          ),
        );
    }
    if (!planId) {
      logError(
        new Error(
          "RPC create_subscription_plan succeeded but returned no plan ID",
        ),
        context,
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Failed to create subscription plan: No ID returned from database",
          ),
        );
    }

    // --- Add Delay ---
    await delay(FETCH_DELAY_MS);

    // 5. Fetch created plan details using API-specific getter (RPC)
    const { data: newPlanData, error: fetchError } = await supabase.rpc(
      "get_subscription_plan",
      { p_plan_id: planId, p_merchant_id: merchant_id },
    );

    // Handle fetch error - plan was created, but couldn't retrieve details (even after delay)
    if (fetchError || !newPlanData || newPlanData.length === 0) {
      const fetchErrorMessage =
        "Subscription plan created, but failed to retrieve details immediately.";
      logError(
        fetchError || new Error("get_subscription_plan returned no data"),
        `${context} - fetch after create`,
        req,
      );
      // Return 201 Created but indicate fetching failed
      return res.status(201).json({
        success: true, // Indicate creation was successful
        message: fetchErrorMessage,
        data: { plan_id: planId }, // Still return the ID
      });
    }

    // 6. Return successful response with full data
    return res.status(201).json({
      success: true,
      data: newPlanData[0] as Types.SubscriptionPlan,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while creating the subscription plan",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * List subscription plans for a merchant
 * GET /merchants/{merchant_id}/subscriptions
 */
export const listSubscriptionPlans = async (req: Request, res: Response) => {
  const context = "listSubscriptionPlans";
  try {
    // 1. Validate path and query parameters together
    const validationResult = listParamsSchema.safeParse({
      ...req.params,
      ...req.query,
    });
    if (!validationResult.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid path or query parameters",
            validationResult.error.format(),
          ),
        );
    }
    const { merchant_id, limit, offset } = validationResult.data;

    // 2. Call list_subscription_plans RPC
    console.log(
      `Calling list_subscription_plans with merchant_id: ${merchant_id}, limit: ${limit}, offset: ${offset}`,
    );
    const { data, error } = await supabase.rpc("list_subscription_plans", {
      p_merchant_id: merchant_id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error(`${context} error details:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      });
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // 3. Return response
    return res.status(200).json({
      success: true,
      data: (data || []) as Types.SubscriptionPlan[],
      meta: {
        // Add pagination metadata
        limit: limit,
        offset: offset,
        total_returned: (data || []).length,
        // Note: total count requires another query/RPC modification
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
          "An unexpected error occurred while listing subscription plans",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Get subscription plan details
 * GET /merchants/{merchant_id}/subscriptions/{plan_id}
 */
export const getSubscriptionPlan = async (req: Request, res: Response) => {
  const context = "getSubscriptionPlan";
  try {
    // 1. Validate path parameters
    const paramsValidation = merchantAndPlanParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Merchant or Plan ID in URL",
            paramsValidation.error.format(),
          ),
        );
    }
    const { merchant_id, plan_id } = paramsValidation.data;

    // 2. Call get_subscription_plan RPC
    console.log(
      `Calling get_subscription_plan with plan_id: ${plan_id}, merchant_id: ${merchant_id}`,
    );
    const { data, error } = await supabase.rpc("get_subscription_plan", {
      p_plan_id: plan_id,
      p_merchant_id: merchant_id,
    });
    // Handle potential DB error (including not found via PGRST116 mapping in handler)
    if (error) {
      console.error(`${context} error details:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      });
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // 3. Check if data is empty (explicit Not Found if RPC succeeded but returned nothing)
    if (!data || data.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Subscription plan not found for this merchant.",
          ),
        );
    }

    // 4. Return response
    return res.status(200).json({
      success: true,
      data: data[0] as Types.SubscriptionPlan,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while retrieving the subscription plan",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Update subscription plan (API specific - only is_active and metadata)
 * PATCH /merchants/{merchant_id}/subscriptions/{plan_id}
 */
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
  const context = "updateSubscriptionPlan";
  try {
    // 1. Validate path parameters
    const paramsValidation = merchantAndPlanParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Merchant or Plan ID in URL",
            paramsValidation.error.format(),
          ),
        );
    }
    const { merchant_id, plan_id } = paramsValidation.data;

    // 2. Validate request body
    const bodyValidation = updateSubscriptionPlanApiSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid request body",
            bodyValidation.error.format(),
          ),
        );
    }
    const updateData = bodyValidation.data;

    // 3. Call update_subscription_plan_api RPC
    const { data: success, error } = await supabase.rpc(
      "update_subscription_plan_api",
      {
        p_plan_id: plan_id,
        p_merchant_id: merchant_id,
        p_metadata: updateData.metadata,
        p_is_active: updateData.is_active,
      },
    );
    if (error) {
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    if (!success) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Subscription plan not found for this merchant or update failed.",
          ),
        );
    }

    // --- Add Delay ---
    await delay(FETCH_DELAY_MS);

    // 5. Fetch updated plan details using RPC
    const { data: updatedPlanData, error: fetchError } = await supabase.rpc(
      "get_subscription_plan",
      { p_plan_id: plan_id, p_merchant_id: merchant_id },
    );

    if (fetchError || !updatedPlanData || updatedPlanData.length === 0) {
      const fetchErrorMessage =
        "Subscription plan updated successfully, but failed to retrieve updated details.";
      logError(
        fetchError ||
          new Error("get_subscription_plan returned no data after update"),
        `${context} - fetch after update`,
        req,
      );
      return res.status(200).json({
        success: true,
        message: fetchErrorMessage,
        data: { plan_id: plan_id, updated_fields: Object.keys(updateData) },
      });
    }

    // 6. Return successful response with updated data
    return res.status(200).json({
      success: true,
      data: updatedPlanData[0] as Types.SubscriptionPlan,
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while updating the subscription plan",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Delete subscription plan
 * DELETE /merchants/{merchant_id}/subscriptions/{plan_id}
 */
export const deleteSubscriptionPlan = async (req: Request, res: Response) => {
  const context = "deleteSubscriptionPlan";
  try {
    // 1. Validate path parameters
    const paramsValidation = merchantAndPlanParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Merchant or Plan ID in URL",
            paramsValidation.error.format(),
          ),
        );
    }
    const { /* merchant_id, */ plan_id } = paramsValidation.data; // merchant_id validated but might not be needed by RPC

    // 2. Call delete_subscription_plan RPC
    const { error: deleteError } = await supabase.rpc(
      "delete_subscription_plan",
      { p_plan_id: plan_id },
    );

    if (deleteError) {
      // handleDatabaseError maps 23503 (in use) to 409 Conflict
      // and PGRST116 (not found) to 404 Not Found
      const errorResponse = handleDatabaseError(deleteError, req, context);
      return res.status(errorResponse.error.status).json(errorResponse);
    }

    // 3. Return successful response (204 No Content)
    return res.status(204).send();
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while deleting the subscription plan",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};
