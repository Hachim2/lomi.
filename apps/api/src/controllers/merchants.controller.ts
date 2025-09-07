import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { Merchant } from "../types/api";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Error codes for better client-side error handling
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  MERCHANT_NOT_FOUND = "MERCHANT_NOT_FOUND",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  MISSING_PARAMETER = "MISSING_PARAMETER",
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

/**
 * Get merchant information
 */
export const getMerchant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // For direct API access, use ID from params. If not present, fallback to middleware-set merchantId
    const merchantId = id || req.merchantId;

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

    // Use RPC function to get merchant details
    const { data, error } = await supabase.rpc("get_merchant_details", {
      p_merchant_id: merchantId,
    });

    if (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve merchant details",
            error.message,
          ),
        );
    }

    // No data found
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.MERCHANT_NOT_FOUND,
            "Merchant not found",
          ),
        );
    }

    // Check if data is an array and take first element if so
    const merchantData = Array.isArray(data) ? data[0] : data;

    // If we have no merchant data object or it's empty, return a friendly error
    if (!merchantData || Object.keys(merchantData).length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "No merchant data found",
          ),
        );
    }

    // Format the response to include all fields from SQL schema
    const merchant: Merchant = {
      merchant_id: merchantData.merchant_id,
      name: merchantData.name,
      email: merchantData.email,
      phone_number: merchantData.phone_number,
      country: merchantData.country,
      mrr: merchantData.mrr,
      arr: merchantData.arr,
      merchant_lifetime_value: merchantData.merchant_lifetime_value,
      retry_payment_every: merchantData.retry_payment_every,
      total_retries: merchantData.total_retries,
      metadata: merchantData.metadata,
      created_at: merchantData.created_at,
      updated_at: merchantData.updated_at,
    };

    // Return a clean response - the environment field will be added by middleware
    res.json({
      data: merchant,
    });
  } catch (error: any) {
    logError(error, "getMerchant", req);
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
 * Get merchant monthly recurring revenue
 * Retrieve current monthly recurring revenue
 */
export const getMerchantMrr = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // For direct API access, use ID from params. If not present, fallback to middleware-set merchantId
    const merchantId = id || req.merchantId;

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

    // Use dedicated MRR RPC function
    const { data, error } = await supabase.rpc("get_merchant_mrr", {
      p_merchant_id: merchantId,
    });

    if (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve merchant MRR",
            error.message,
          ),
        );
    }

    // No data found
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.MERCHANT_NOT_FOUND,
            "Merchant not found",
          ),
        );
    }

    // Check if data is an array and take first element if so
    const mrrData = Array.isArray(data) ? data[0] : data;

    // If we have no MRR data object or it's empty, return a friendly error
    if (!mrrData || Object.keys(mrrData).length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ErrorCode.NOT_FOUND, "No MRR data found"),
        );
    }

    // Format the response with MRR information
    res.json({
      data: {
        merchant_id: mrrData.merchant_id,
        mrr: mrrData.mrr,
        currency_code: mrrData.currency_code || "XOF", // Use the currency from the function or default
        as_of_date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logError(error, "getMerchantMrr", req);
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
 * Get merchant annual recurring revenue
 * Retrieve current annual recurring revenue
 */
export const getMerchantArr = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // For direct API access, use ID from params. If not present, fallback to middleware-set merchantId
    const merchantId = id || req.merchantId;

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

    // Use dedicated ARR RPC function
    const { data, error } = await supabase.rpc("get_merchant_arr", {
      p_merchant_id: merchantId,
    });

    if (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve merchant ARR",
            error.message,
          ),
        );
    }

    // No data found
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.MERCHANT_NOT_FOUND,
            "Merchant not found",
          ),
        );
    }

    // Check if data is an array and take first element if so
    const arrData = Array.isArray(data) ? data[0] : data;

    // If we have no ARR data object or it's empty, return a friendly error
    if (!arrData || Object.keys(arrData).length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ErrorCode.NOT_FOUND, "No ARR data found"),
        );
    }

    // Format the response with ARR information
    res.json({
      data: {
        merchant_id: arrData.merchant_id,
        arr: arrData.arr,
        currency_code: arrData.currency_code || "XOF", // Use the currency from the function or default
        as_of_date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logError(error, "getMerchantArr", req);
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
 * Get merchant account balance
 * Retrieve current account balance for a merchant
 */
export const getMerchantBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currency_code } = req.query;

    // For direct API access, use ID from params. If not present, fallback to middleware-set merchantId
    const merchantId = id || req.merchantId;

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

    if (!currency_code) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.MISSING_PARAMETER,
            "Currency code is required",
          ),
        );
    }

    // Use RPC function to get merchant balance for the specified currency
    const { data, error } = await supabase.rpc("get_merchant_balance", {
      p_merchant_id: merchantId,
      p_currency_code: currency_code,
    });

    if (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve merchant balance",
            error.message,
          ),
        );
    }

    // Format the response with balance information
    res.json({
      data: {
        merchant_id: merchantId,
        currency_code: currency_code,
        balance: data,
        as_of_date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logError(error, "getMerchantBalance", req);
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
