import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CurrencyCode, PaymentLinkType, ProviderCode } from "../types/api";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Error codes for better client-side error handling
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  INVALID_REFERENCE = "INVALID_REFERENCE",
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
    merchantId: req.merchantId, // Assuming middleware adds merchantId to req
    organizationId: req.organizationId, // Assuming middleware adds organizationId to req
  });
}

// Create payment link request validation schema
const createPaymentLinkSchema = z
  .object({
    merchant_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
    link_type: z.nativeEnum(PaymentLinkType),
    product_id: z.string().uuid().optional(),
    plan_id: z.string().uuid().optional(),
    title: z.string(),
    public_description: z.string().optional(),
    private_description: z.string().optional(),
    price: z.number().optional(),
    currency_code: z.nativeEnum(CurrencyCode),
    allowed_providers: z.array(z.nativeEnum(ProviderCode)).optional(),
    allow_coupon_code: z.boolean().optional(),
    allow_quantity: z.boolean().optional(),
    is_active: z.boolean().optional(),
    expires_at: z.string().datetime().optional(),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine(
    (data) => {
      // Ensure product_id is provided for product link type
      if (data.link_type === PaymentLinkType.product) {
        return !!data.product_id;
      }
      // Ensure plan_id is provided for plan link type
      if (data.link_type === PaymentLinkType.plan) {
        return !!data.plan_id;
      }
      // Ensure price is provided for instant link type
      if (data.link_type === PaymentLinkType.instant) {
        return !!data.price;
      }
      return true;
    },
    {
      message:
        "Invalid payment link configuration: product_id is required for 'product' type, plan_id is required for 'plan' type, and price is required for 'instant' type.",
    },
  );

// Update payment link request validation schema (API-specific)
const updatePaymentLinkApiSchema = z.object({
  // Fields allowed for update via API
  expires_at: z.string().datetime().optional().nullable(), // Allow setting to null
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  allowed_providers: z.array(z.nativeEnum(ProviderCode)).optional(),
  allow_coupon_code: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  // Explicitly exclude fields not updatable via API:
  // title, public_description, private_description, price, allow_quantity
});

/**
 * Create a payment link
 */
export const createPaymentLink = async (req: Request, res: Response) => {
  const context = "createPaymentLink";
  try {
    // Validate request body
    const validationResult = createPaymentLinkSchema.safeParse(req.body);
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

    const paymentLinkData = validationResult.data;
    // Primarily use merchantId from authenticated request context
    const merchantId = req.merchantId;
    let organizationId = req.organizationId;

    // Ensure merchantId is present (should be set by auth middleware)
    if (!merchantId) {
      // This error should ideally not be hit if auth middleware is working
      logError(
        "Merchant ID missing from authenticated request context",
        context,
        req,
      );
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication error: Merchant ID could not be determined from API key.",
          ),
        );
    }

    // Fetch organization_id if not available in context (middleware should provide this too ideally)
    if (!organizationId) {
      const { data: orgData, error: orgError } = await supabase.rpc(
        "get_merchant_organization_id",
        { p_merchant_id: merchantId },
      );

      if (orgError || !orgData) {
        logError(orgError, `${context} - get_merchant_organization_id`, req);
        // Use a more specific error if org lookup fails despite valid merchant
        return res
          .status(500)
          .json(
            createErrorResponse(
              500,
              ErrorCode.DATABASE_ERROR,
              `Failed to retrieve organization details for the authenticated merchant ${merchantId}`,
              orgError?.message,
            ),
          );
      }
      organizationId = orgData; // Use the fetched organization ID
    }

    // Determine p_allow_quantity based on link type
    const allowQuantity =
      paymentLinkData.link_type === PaymentLinkType.product
        ? (paymentLinkData.allow_quantity ?? false)
        : false;

    // Call create_payment_link RPC using IDs from context/lookup
    const { data: linkId, error: createRpcError } = await supabase.rpc(
      "create_payment_link",
      {
        p_merchant_id: merchantId, // Use validated merchantId from context
        p_organization_id: organizationId, // Use validated organizationId from context/lookup
        p_link_type: paymentLinkData.link_type,
        p_title: paymentLinkData.title,
        p_currency_code: paymentLinkData.currency_code,
        p_public_description: paymentLinkData.public_description,
        p_private_description: paymentLinkData.private_description,
        p_price: paymentLinkData.price,
        p_allowed_providers: paymentLinkData.allowed_providers || [],
        p_allow_coupon_code: paymentLinkData.allow_coupon_code || false,
        p_allow_quantity: allowQuantity, // Explicitly pass allow_quantity
        p_expires_at: paymentLinkData.expires_at,
        p_success_url: paymentLinkData.success_url,
        p_cancel_url: paymentLinkData.cancel_url,
        p_plan_id: paymentLinkData.plan_id,
        p_product_id: paymentLinkData.product_id,
      },
    );

    if (createRpcError || !linkId) {
      logError(createRpcError, `${context} - create_payment_link RPC`, req);
      if (
        createRpcError?.message.includes(
          "duplicate key value violates unique constraint",
        )
      ) {
        return res
          .status(409)
          .json(
            createErrorResponse(
              409,
              ErrorCode.RESOURCE_CONFLICT,
              "A payment link with similar properties (e.g., URL) might already exist.",
              createRpcError.message,
            ),
          );
      }
      if (createRpcError?.message.includes("foreign key constraint")) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              ErrorCode.INVALID_REFERENCE,
              "Invalid reference: Ensure product_id or plan_id exists.",
              createRpcError.message,
            ),
          );
      }
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to create payment link in database",
            createRpcError?.message,
          ),
        );
    }

    // Get newly created payment link details
    const { data: paymentLink, error: fetchError } = await supabase.rpc(
      "get_payment_link",
      {
        p_link_id: linkId, // Use the ID returned by create_payment_link
        p_merchant_id: merchantId,
      },
    );

    if (fetchError || !paymentLink || paymentLink.length === 0) {
      logError(
        fetchError,
        `${context} - get_payment_link RPC after create`,
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Payment link created but failed to retrieve details",
            fetchError?.message,
          ),
        );
    }

    return res.status(201).json({
      success: true,
      data: paymentLink[0],
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "Internal server error",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * List payment links for a merchant
 */
export const listPaymentLinks = async (req: Request, res: Response) => {
  const context = "listPaymentLinks";
  try {
    const {
      link_type,
      currency_code,
      is_active,
      page = "1",
      page_size = "50",
      include_expired = "false",
    } = req.query;

    const merchantId = req.merchantId;
    const organizationId = req.organizationId;

    // Use merchantId/orgId from request context (added by auth middleware)
    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required: Merchant ID not found in request context.",
          ),
        );
    }

    // Basic validation for query parameters
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(page_size as string);
    if (
      isNaN(pageNum) ||
      pageNum < 1 ||
      isNaN(pageSizeNum) ||
      pageSizeNum < 1 ||
      pageSizeNum > 100
    ) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid pagination parameters: page must be >= 1, page_size must be between 1 and 100.",
          ),
        );
    }

    // Call fetch_payment_links RPC function
    const { data, error: listError } = await supabase.rpc(
      "fetch_payment_links",
      {
        p_merchant_id: merchantId as string,
        p_organization_id: (organizationId as string) || null,
        p_link_type: (link_type as PaymentLinkType) || null,
        p_currency_code: (currency_code as CurrencyCode) || null,
        p_is_active:
          is_active === "true" ? true : is_active === "false" ? false : null,
        p_page: pageNum,
        p_page_size: pageSizeNum,
        p_include_expired: include_expired === "true",
      },
    );

    if (listError) {
      logError(listError, `${context} - fetch_payment_links RPC`, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to list payment links",
            listError.message,
          ),
        );
    }

    return res.status(200).json({
      success: true,
      data: data || [], // Ensure data is always an array
      meta: {
        current_page: pageNum,
        per_page: pageSizeNum,
        // Consider adding total_count if the RPC provides it
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
          "Internal server error",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Get payment link details
 */
export const getPaymentLink = async (req: Request, res: Response) => {
  const context = "getPaymentLink";
  try {
    const { link_id } = req.params;
    const merchantId = req.merchantId; // Get from auth middleware

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required: Merchant ID not found in request context.",
          ),
        );
    }

    if (!link_id || typeof link_id !== "string") {
      // Basic validation
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Valid link_id path parameter is required.",
          ),
        );
    }

    // Call get_payment_link RPC function
    const { data, error: getError } = await supabase.rpc("get_payment_link", {
      p_link_id: link_id,
      p_merchant_id: merchantId, // Filter by merchant_id for security
    });

    if (getError) {
      logError(getError, `${context} - get_payment_link RPC`, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve payment link",
            getError.message,
          ),
        );
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            `Payment link with ID ${link_id} not found or not accessible by this merchant.`,
          ),
        );
    }

    return res.status(200).json({
      success: true,
      data: data[0],
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "Internal server error",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Update payment link
 */
export const updatePaymentLink = async (req: Request, res: Response) => {
  const context = "updatePaymentLink";
  try {
    const { link_id } = req.params;
    const merchantId = req.merchantId; // Get from auth middleware

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required: Merchant ID not found in request context.",
          ),
        );
    }

    if (!link_id || typeof link_id !== "string") {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Valid link_id path parameter is required.",
          ),
        );
    }

    // Validate request body using the API-specific schema
    const validationResult = updatePaymentLinkApiSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid request data for update",
            validationResult.error.format(),
          ),
        );
    }

    const updateData = validationResult.data;

    // Add check: Ensure the link belongs to the authenticated merchant before updating
    // This requires a preliminary check using get_payment_link or similar
    const { data: existingLink, error: checkError } = await supabase.rpc(
      "get_payment_link",
      { p_link_id: link_id, p_merchant_id: merchantId },
    );

    if (checkError || !existingLink || existingLink.length === 0) {
      logError(checkError, `${context} - pre-update check`, req);
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            `Payment link with ID ${link_id} not found or not accessible by this merchant.`,
            checkError?.message,
          ),
        );
    }

    // Call update_payment_link RPC, passing null for fields not allowed in API update
    const { data: updatedLinkResult, error: updateError } = await supabase.rpc(
      "update_payment_link",
      {
        p_link_id: link_id,
        // API Updatable fields:
        p_expires_at: updateData.expires_at, // Pass expires_at if provided
        p_success_url: updateData.success_url,
        p_cancel_url: updateData.cancel_url,
        p_allowed_providers: updateData.allowed_providers,
        p_allow_coupon_code: updateData.allow_coupon_code,
        // Fields NOT updatable via API - pass null to RPC:
        p_is_active: null, // Explicitly pass null for is_active
        p_title: null,
        p_public_description: null,
        p_private_description: null,
        p_price: null,
        p_allow_quantity: null, // Pass null for allow_quantity as well
      },
    );

    if (updateError) {
      logError(updateError, `${context} - update_payment_link RPC`, req);
      // Handle potential specific errors from update
      if (
        updateError?.message.includes(
          "duplicate key value violates unique constraint",
        )
      ) {
        return res
          .status(409)
          .json(
            createErrorResponse(
              409,
              ErrorCode.RESOURCE_CONFLICT,
              "Update failed: This would create a conflict (e.g., duplicate URL).",
              updateError.message,
            ),
          );
      }
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to update payment link",
            updateError.message,
          ),
        );
    }

    // If updatedLinkResult is null or empty array, it might mean the RPC doesn't return the full object,
    // or the update affected 0 rows (already checked above). Refetch to be sure.
    const { data: finalLink, error: finalFetchError } = await supabase.rpc(
      "get_payment_link",
      { p_link_id: link_id, p_merchant_id: merchantId },
    );

    if (finalFetchError || !finalLink || finalLink.length === 0) {
      logError(finalFetchError, `${context} - post-update fetch`, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Payment link updated, but failed to retrieve final details.",
            finalFetchError?.message,
          ),
        );
    }

    return res.status(200).json({
      success: true,
      data: finalLink[0], // Return the freshly fetched link
    });
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "Internal server error",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};

/**
 * Delete payment link
 */
export const deletePaymentLink = async (req: Request, res: Response) => {
  const context = "deletePaymentLink";
  try {
    const { link_id } = req.params;
    const merchantId = req.merchantId; // Get from auth middleware

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required: Merchant ID not found in request context.",
          ),
        );
    }

    if (!link_id || typeof link_id !== "string") {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Valid link_id path parameter is required.",
          ),
        );
    }

    // Add check: Ensure the link belongs to the authenticated merchant before deleting
    const { data: existingLink, error: checkError } = await supabase.rpc(
      "get_payment_link",
      { p_link_id: link_id, p_merchant_id: merchantId },
    );

    if (checkError || !existingLink || existingLink.length === 0) {
      logError(checkError, `${context} - pre-delete check`, req);
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            `Payment link with ID ${link_id} not found or not accessible by this merchant.`,
            checkError?.message,
          ),
        );
    }

    // Call safe_delete_payment_link RPC
    const { data: success, error: deleteError } = await supabase.rpc(
      "safe_delete_payment_link",
      { p_link_id: link_id },
    );

    if (deleteError) {
      logError(deleteError, `${context} - safe_delete_payment_link RPC`, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to delete payment link",
            deleteError.message,
          ),
        );
    }

    if (!success) {
      // This case might be redundant due to the pre-check, but kept for safety
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Payment link not found or could not be deleted (it may have been deleted already).",
          ),
        );
    }

    return res.status(204).send(); // Success, no content
  } catch (error: any) {
    logError(error, context, req);
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "Internal server error",
          process.env.NODE_ENV === "production" ? undefined : error.message,
        ),
      );
  }
};
