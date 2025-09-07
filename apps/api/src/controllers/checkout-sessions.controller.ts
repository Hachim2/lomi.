import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CurrencyCode,
  ProviderCode,
  CheckoutSessionStatus,
} from "../types/api";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define currently supported providers and currencies
const SUPPORTED_PROVIDERS = ["ORANGE", "WAVE", "NOWPAYMENTS"];
const SUPPORTED_CURRENCIES = ["XOF"];

// Error codes for better client-side error handling
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  INVALID_REFERENCE = "INVALID_REFERENCE",
  UNSUPPORTED_CURRENCY = "UNSUPPORTED_CURRENCY",
  UNSUPPORTED_PROVIDER = "UNSUPPORTED_PROVIDER",
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
    merchantId: req.merchantId,
  });
}

// Checkout session request validation schema
const createCheckoutSessionSchema = z.object({
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  allowed_providers: z.array(z.nativeEnum(ProviderCode)),
  amount: z.number().positive().optional(),
  currency_code: z.nativeEnum(CurrencyCode),
  title: z.string().optional(),
  public_description: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  product_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  expiration_minutes: z.number().int().positive().optional(),
  allow_coupon_code: z.boolean().optional(),
  allow_quantity: z.boolean().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
});

/**
 * Create a new checkout session
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createCheckoutSessionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid request body",
            validationResult.error.format(),
          ),
        );
    }

    // Business logic validation - Check if currency is supported
    if (!SUPPORTED_CURRENCIES.includes(validationResult.data.currency_code)) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.UNSUPPORTED_CURRENCY,
            `Currency ${validationResult.data.currency_code} is not currently supported`,
            `Currently supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
          ),
        );
    }

    // Business logic validation - Check if all providers are supported
    const hasUnsupportedProvider = validationResult.data.allowed_providers.some(
      (provider) => !SUPPORTED_PROVIDERS.includes(provider),
    );

    if (hasUnsupportedProvider) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.UNSUPPORTED_PROVIDER,
            "One or more selected payment providers are not currently supported",
            `Currently supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
          ),
        );
    }

    const {
      success_url,
      cancel_url,
      allowed_providers,
      amount: providedAmount,
      currency_code,
      title,
      public_description,
      customer_email,
      customer_name,
      customer_phone,
      product_id,
      subscription_id,
      plan_id,
      metadata,
      expiration_minutes = 30,
      allow_coupon_code = true,
      allow_quantity = false,
      quantity = 1,
    } = validationResult.data;

    const merchantId = req.merchantId;
    const organizationId = req.organizationId;

    if (!merchantId || !organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Merchant ID or Organization ID not found",
          ),
        );
    }

    // Calculate amount if not provided
    let finalAmount = providedAmount;
    let calculatedCurrency = currency_code;
    let finalAllowQuantity = allow_quantity;
    let finalQuantity = quantity;
    let finalAllowCouponCode = allow_coupon_code;

    if (product_id || plan_id) {
      // When product_id or plan_id is provided, ALWAYS use the authoritative price from database
      // This prevents clients from overriding the actual product price
      try {
        if (product_id) {
          // Get product price and currency using RPC function
          const { data: productData, error: productError } = await supabase.rpc(
            "get_product_for_checkout",
            {
              p_product_id: product_id,
              p_merchant_id: merchantId,
            }
          );

          if (productError || !productData) {
            return res
              .status(400)
              .json(
                createErrorResponse(
                  400,
                  ErrorCode.INVALID_REFERENCE,
                  "Product not found or doesn't belong to merchant",
                ),
              );
          }

          // ALWAYS use the authoritative product price from database
          finalAmount = productData.price * finalQuantity;
          calculatedCurrency = productData.currency_code;
          
          // Warn if provided amount doesn't match the calculated amount
          if (providedAmount && Math.abs(providedAmount - finalAmount) > 0.01) {
            console.warn(`Provided amount (${providedAmount}) doesn't match calculated amount (${finalAmount}) for product ${product_id}. Using calculated amount.`);
          }
          
          // For products, allow quantity changes by default unless explicitly disabled
          if (allow_quantity === undefined) {
            finalAllowQuantity = true;
          }
          
          // Inherit coupon settings from product if not explicitly set
          if (allow_coupon_code === undefined && productData.allow_coupon_code !== undefined) {
            finalAllowCouponCode = productData.allow_coupon_code;
          }
        } else if (plan_id) {
          // Get plan amount and currency using RPC function
          const { data: planData, error: planError } = await supabase.rpc(
            "get_plan_for_checkout",
            {
              p_plan_id: plan_id,
              p_merchant_id: merchantId,
            }
          );

          if (planError || !planData) {
            return res
              .status(400)
              .json(
                createErrorResponse(
                  400,
                  ErrorCode.INVALID_REFERENCE,
                  "Subscription plan not found or doesn't belong to merchant",
                ),
              );
          }

          // ALWAYS use the authoritative plan price from database
          finalAmount = planData.amount; // Plans don't use quantity
          calculatedCurrency = planData.currency_code;
          finalQuantity = 1; // Force quantity to 1 for plans
          finalAllowQuantity = false; // Plans shouldn't allow quantity changes
          
          // Warn if provided amount doesn't match the plan amount
          if (providedAmount && finalAmount && Math.abs(providedAmount - finalAmount) > 0.01) {
            console.warn(`Provided amount (${providedAmount}) doesn't match plan amount (${finalAmount}) for plan ${plan_id}. Using plan amount.`);
          }
          
          // Inherit coupon settings from plan if not explicitly set
          if (allow_coupon_code === undefined && planData.allow_coupon_code !== undefined) {
            finalAllowCouponCode = planData.allow_coupon_code;
          }
        }
      } catch (error) {
        return res
          .status(500)
          .json(
            createErrorResponse(
              500,
              ErrorCode.DATABASE_ERROR,
              "Failed to fetch product/plan details",
            ),
          );
      }
    }

    // Validate that currency matches
    if (calculatedCurrency !== currency_code) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            `Provided currency (${currency_code}) doesn't match product/plan currency (${calculatedCurrency})`,
          ),
        );
    }

    // Require amount for instant payments (when no product_id or plan_id)
    if (!finalAmount && !product_id && !plan_id) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Amount is required for instant payments (no product_id or plan_id provided)",
          ),
        );
    }

    // Use RPC function to create checkout session
    const { data, error } = await supabase.rpc("create_checkout_session", {
      p_merchant_id: merchantId,
      p_organization_id: organizationId,
      p_success_url: success_url,
      p_cancel_url: cancel_url,
      p_amount: finalAmount!,
      p_currency_code: currency_code,
      p_allowed_providers: allowed_providers,
      p_title: title,
      p_public_description: public_description,
      p_customer_email: customer_email,
      p_customer_name: customer_name,
      p_customer_phone: customer_phone,
      p_product_id: product_id,
      p_plan_id: plan_id,
      p_metadata: metadata,
      p_expiration_minutes: expiration_minutes,
      p_allow_coupon_code: finalAllowCouponCode,
      p_allow_quantity: finalAllowQuantity,
      p_quantity: finalQuantity,
    });

    if (error) {
      console.error("Error creating checkout session:", error);

      // Handle specific database errors
      if (error.message.includes("unique constraint")) {
        return res
          .status(409)
          .json(
            createErrorResponse(
              409,
              "RESOURCE_CONFLICT",
              "A resource with this identifier already exists",
              error.message,
            ),
          );
      }

      if (error.message.includes("foreign key constraint")) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              "INVALID_REFERENCE",
              "Referenced resource does not exist",
              error.message,
            ),
          );
      }

      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to create checkout session",
            error.message,
          ),
        );
    }

    // Format the response
    const checkoutSessionId = data;
    const checkoutUrl = `${process.env.CHECKOUT_URL || "https://checkout.lomi.africa"}/checkout/${checkoutSessionId.checkout_session_id}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiration_minutes);
    const createdAt = new Date();

    res.status(201).json({
      data: {
        checkout_session_id: checkoutSessionId.checkout_session_id,
        url: checkoutUrl,
        status: CheckoutSessionStatus.open,
        expires_at: expiresAt.toISOString(),
        created_at: createdAt.toISOString(),
        merchant_id: merchantId,
        organization_id: organizationId,
        success_url,
        cancel_url,
        amount: finalAmount,
        currency_code,
        allowed_providers,
        title,
        public_description,
        allow_coupon_code: finalAllowCouponCode,
        allow_quantity: finalAllowQuantity,
        quantity: finalQuantity,
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
      },
    });
  } catch (error: any) {
    logError(error, "createCheckoutSession", req);
    res
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
 * Get checkout session by ID
 */
export const getCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId;

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Merchant ID not found",
          ),
        );
    }

    // Use RPC function to get checkout session
    const { data, error } = await supabase.rpc("get_checkout_session", {
      p_checkout_session_id: id,
    });

    if (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve checkout session",
            error.message,
          ),
        );
    }

    if (!data) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Checkout session not found",
          ),
        );
    }

    // Verify that the checkout session belongs to the merchant
    if (data.merchant_id !== merchantId) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            403,
            ErrorCode.FORBIDDEN,
            "You don't have permission to access this checkout session",
          ),
        );
    }

    // Format the session for the API response
    const checkoutUrl = `${process.env.CHECKOUT_URL || "https://checkout.lomi.africa"}/checkout/${data.checkout_session_id}`;

    res.json({
      data: {
        checkout_session_id: data.checkout_session_id,
        merchant_id: data.merchant_id,
        organization_id: data.organization_id,
        payment_link_id: data.payment_link_id,
        customer_id: data.customer_id,
        product_id: data.product_id,
        subscription_id: data.subscription_id,
        plan_id: data.plan_id,
        amount: data.amount,
        currency_code: data.currency_code,
        status: data.status,
        url: checkoutUrl,
        success_url: data.success_url,
        cancel_url: data.cancel_url,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        allowed_providers: data.allowed_providers,
        metadata: data.metadata,
        created_at: data.created_at,
        updated_at: data.updated_at,
        expires_at: data.expires_at,
        allow_quantity: data.allow_quantity,
        quantity: data.quantity,
      },
    });
  } catch (error: any) {
    logError(error, "getCheckoutSession", req);
    res
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
 * List checkout sessions for a merchant
 */
export const listCheckoutSessions = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { limit = 20, page = 1, status } = req.query;

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Merchant ID not found",
          ),
        );
    }

    // Use RPC function to list checkout sessions
    const { data, error } = await supabase.rpc("list_checkout_sessions", {
      p_merchant_id: merchantId,
      p_status: (status as string) || null,
      p_limit: Number(limit),
      p_offset: (Number(page) - 1) * Number(limit),
    });

    if (error) {
      // Check for logs constraint error specifically
      if (error.message.includes("logs_severity_check")) {
        console.error(
          "Database severity constraint error in list_checkout_sessions RPC function. " +
            "The function is likely using an invalid severity value when logging. " +
            "You need to update the RPC function to use a valid severity value (e.g., 'notice' instead of 'NOTICE').",
        );
      }

      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to list checkout sessions",
            error.message,
          ),
        );
    }

    // Format the sessions for the API response
    const formattedSessions = data.map((session: any) => {
      const checkoutUrl = `${process.env.CHECKOUT_URL || "https://checkout.lomi.africa"}/checkout/${session.checkout_session_id}`;

      // Return the formatted session object within the map function
      return {
        checkout_session_id: session.checkout_session_id,
        merchant_id: session.merchant_id,
        organization_id: session.organization_id,
        payment_link_id: session.payment_link_id,
        customer_id: session.customer_id,
        product_id: session.product_id,
        subscription_id: session.subscription_id,
        plan_id: session.plan_id,
        amount: session.amount,
        currency_code: session.currency_code,
        status: session.status,
        url: checkoutUrl,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        customer_email: session.customer_email,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone,
        allowed_providers: session.allowed_providers,
        metadata: session.metadata,
        created_at: session.created_at,
        updated_at: session.updated_at,
        expires_at: session.expires_at,
        title: session.title,
        public_description: session.public_description,
        allow_coupon_code: session.allow_coupon_code,
        allow_quantity: session.allow_quantity,
        quantity: session.quantity,
      };
    });

    res.json({
      data: formattedSessions,
      meta: {
        current_page: Number(page),
        per_page: Number(limit),
      },
    });
  } catch (error: any) {
    logError(error, "listCheckoutSessions", req);
    res
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
