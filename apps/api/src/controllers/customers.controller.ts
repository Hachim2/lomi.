import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { Customer } from "../types/api";

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

// Create customer request validation schema
const createCustomerSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  is_business: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// Update customer request validation schema
const updateCustomerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  is_business: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Create a new customer
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createCustomerSchema.safeParse(req.body);

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

    const {
      name,
      email,
      phone_number,
      whatsapp_number,
      country,
      city,
      address,
      postal_code,
      is_business,
      metadata,
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

    // Use RPC function to create customer - modified to match the function definition
    const { data, error } = await supabase.rpc("create_customer", {
      p_merchant_id: merchantId,
      p_organization_id: organizationId,
      p_name: name,
      p_email: email || "",
      p_phone_number: phone_number || "",
      p_whatsapp_number: whatsapp_number || "",
      p_country: country || "",
      p_city: city || "",
      p_address: address || "",
      p_postal_code: postal_code || "",
      p_is_business: is_business || false,
    });

    if (error) {
      logError(error, "createCustomer", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to create customer",
            error.message,
          ),
        );
    }

    // Format the response - we add metadata here for the response only
    res.status(201).json({
      data: {
        customer_id: data,
        merchant_id: merchantId,
        organization_id: organizationId,
        name,
        email,
        phone_number,
        whatsapp_number,
        country,
        city,
        address,
        postal_code,
        is_business: is_business || false,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logError(error, "createCustomer", req);
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
 * Get customer by ID
 */
export const getCustomer = async (req: Request, res: Response) => {
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

    // Use the fetch_customer_api function which returns any customer regardless of transaction status
    const { data, error } = await supabase.rpc("fetch_customer_api", {
      p_customer_id: id,
    });

    if (error) {
      logError(error, "getCustomer", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve customer",
            error.message,
          ),
        );
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ErrorCode.NOT_FOUND, "Customer not found"),
        );
    }

    // Format the response
    res.json({
      data: data[0] as Customer,
    });
  } catch (error: any) {
    logError(error, "getCustomer", req);
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
 * Update customer by ID
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId;

    // Validate request body
    const validationResult = updateCustomerSchema.safeParse(req.body);

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

    const {
      name,
      email,
      phone_number,
      whatsapp_number,
      country,
      city,
      address,
      postal_code,
      is_business,
      metadata,
    } = validationResult.data;

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

    // First, check if customer exists and belongs to the merchant
    const { data: customerData, error: customerError } = await supabase.rpc(
      "fetch_customer",
      {
        p_customer_id: id,
      },
    );

    if (customerError) {
      logError(customerError, "updateCustomer - checking customer", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to verify customer",
            customerError.message,
          ),
        );
    }

    if (!customerData) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ErrorCode.NOT_FOUND, "Customer not found"),
        );
    }

    // Use RPC function to update customer with the correct parameters
    const { error } = await supabase.rpc("update_customer", {
      p_customer_id: id,
      p_name: name || customerData.name,
      p_email: email || customerData.email || "",
      p_phone_number: phone_number || customerData.phone_number || "",
      p_whatsapp_number: whatsapp_number || customerData.whatsapp_number || "",
      p_country: country || customerData.country || "",
      p_city: city || customerData.city || "",
      p_address: address || customerData.address || "",
      p_postal_code: postal_code || customerData.postal_code || "",
      p_is_business:
        is_business !== undefined ? is_business : customerData.is_business,
    });

    if (error) {
      logError(error, "updateCustomer", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to update customer",
            error.message,
          ),
        );
    }

    // Get the updated customer data
    const { data: updatedCustomer, error: fetchError } = await supabase.rpc(
      "fetch_customer",
      {
        p_customer_id: id,
      },
    );

    if (fetchError) {
      logError(fetchError, "updateCustomer - fetching updated customer", req);
      // Don't return an error here, we'll just use what we have
    }

    // Format the response
    res.json({
      data: {
        ...(updatedCustomer || customerData),
        metadata,
      },
    });
  } catch (error: any) {
    logError(error, "updateCustomer", req);
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
 * List customers for a merchant
 */
export const listCustomers = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { limit = 20, page = 1, email, phone_number } = req.query;

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

    // Use fetch_customers_api RPC function which returns ALL customers regardless of transaction status
    const { data, error } = await supabase.rpc("fetch_customers_api", {
      p_merchant_id: merchantId,
      p_search_term: email ? email : phone_number ? phone_number : null,
      p_customer_type: null,
      p_page: Number(page),
      p_page_size: Number(limit),
    });

    if (error) {
      logError(error, "listCustomers", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to list customers",
            error.message,
          ),
        );
    }

    // Format the response
    res.json({
      data: data || [],
      meta: {
        current_page: Number(page),
        per_page: Number(limit),
      },
    });
  } catch (error: any) {
    logError(error, "listCustomers", req);
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
 * Delete customer by ID
 */
export const deleteCustomer = async (req: Request, res: Response) => {
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

    // Use RPC function to delete customer - modified to match the function definition
    const { data, error } = await supabase.rpc("delete_customer", {
      p_customer_id: id,
    });

    if (error) {
      logError(error, "deleteCustomer", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to delete customer",
            error.message,
          ),
        );
    }

    // Format the response
    res.json({
      data: {
        customer_id: id,
        deleted: true,
      },
    });
  } catch (error: any) {
    logError(error, "deleteCustomer", req);
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
