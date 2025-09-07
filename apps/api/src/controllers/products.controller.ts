import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CurrencyCode } from "../types/api";

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
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
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
    merchantId: req.merchantId, // Use authenticated merchantId
    productId: req.params?.product_id,
  });
}

// Create product request validation schema (Matches original create_product RPC)
const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  currency_code: z.nativeEnum(CurrencyCode),
  is_active: z.boolean().optional(),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
  display_on_storefront: z.boolean().optional(),
  fee_type_ids: z.array(z.string().uuid("Invalid fee type ID")).optional(),
});

// Update product request validation schema (RESTRICTED - Only allows is_active)
const updateProductSchema = z.object({
  is_active: z.boolean(), // is_active is now required if updating
});

/**
 * Create a new product
 * Uses the original create_product (SECURITY DEFINER) function
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId; // Use authenticated merchantId
    const organizationId = req.organizationId; // Use authenticated organizationId

    if (!merchantId || !organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required: Merchant or Organization ID missing",
          ),
        );
    }

    // Validate request body against createProductSchema
    const validationResult = createProductSchema.safeParse(req.body);
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

    const productData = validationResult.data;

    // Call original create_product RPC
    const { data: newProductId, error } = await supabase.rpc("create_product", {
      p_merchant_id: merchantId,
      p_organization_id: organizationId,
      p_name: productData.name,
      p_description: productData.description,
      p_price: productData.price,
      p_currency_code: productData.currency_code,
      p_is_active: productData.is_active ?? true,
      p_image_url: productData.image_url,
      p_display_on_storefront: productData.display_on_storefront ?? true,
      p_fee_type_ids: productData.fee_type_ids,
    });

    if (error) {
      logError(error, "createProduct RPC", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to create product",
            error.message,
          ),
        );
    }

    if (!newProductId) {
      logError(
        "No product ID returned from create_product RPC",
        "createProduct",
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Product created but failed to retrieve ID",
          ),
        );
    }

    // Fetch the newly created product using get_product_service (for service role)
    const { data: newProductData, error: fetchError } = await supabase.rpc(
      "get_product_service", // Use the service role version
      {
        p_product_id: newProductId,
        p_merchant_id: merchantId, // Optional merchant ID check
      },
    );

    if (fetchError) {
      logError(fetchError, "createProduct -> get_product_service RPC", req);
      // Product was created, but fetching failed. Return 500.
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Product created but failed to retrieve details",
            fetchError.message,
          ),
        );
    }

    if (!newProductData || newProductData.length === 0) {
      logError(
        "get_product_service RPC returned no data after creation",
        "createProduct",
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Product created but failed to retrieve details (not found)",
          ),
        );
    }

    // Note: get_product_service returns an array, take the first element
    return res.status(201).json({
      data: newProductData[0],
    });
  } catch (error: any) {
    logError(error, "createProduct Catch", req);
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
 * List products for a merchant
 * Uses the service role version of list_products function
 */
export const listProducts = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId; // Use authenticated merchant ID
    const { limit = 20, offset = 0, is_active } = req.query;

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
          ),
        );
    }

    const queryLimit = parseInt(limit as string);
    const queryOffset = parseInt(offset as string);
    // Convert query string 'true'/'false' to boolean, otherwise pass undefined
    let queryIsActive: boolean | undefined = undefined;
    if (typeof is_active === "string") {
      if (is_active.toLowerCase() === "true") queryIsActive = true;
      if (is_active.toLowerCase() === "false") queryIsActive = false;
    }

    if (
      isNaN(queryLimit) ||
      queryLimit <= 0 ||
      isNaN(queryOffset) ||
      queryOffset < 0
    ) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid limit or offset parameter",
          ),
        );
    }

    // Call list_products_service RPC function (for service role) and request count
    const { data, error, count } = await supabase.rpc(
      "list_products_service",
      {
        p_merchant_id: merchantId,
        p_limit: queryLimit,
        p_offset: queryOffset,
        p_is_active: queryIsActive,
      },
      { count: "exact" },
    ); // Get total count for pagination

    if (error) {
      logError(error, "list_products_service RPC", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to list products",
            error.message,
          ),
        );
    }

    // Ensure data is an array even if empty
    const products = Array.isArray(data) ? data : [];

    return res.status(200).json({
      data: products,
      meta: {
        total_count: count ?? 0,
        limit: queryLimit,
        offset: queryOffset,
      },
    });
  } catch (error: any) {
    logError(error, "listProducts Catch", req);
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
 * Get product details
 * Uses the service role version of get_product function
 */
export const getProduct = async (req: Request, res: Response) => {
  try {
    const { product_id } = req.params;
    const merchantId = req.merchantId; // Use authenticated merchant ID

    if (!product_id) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.MISSING_PARAMETER,
            "Product ID is required in path",
          ),
        );
    }

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
          ),
        );
    }

    // Call get_product_service RPC function (for service role)
    const { data, error } = await supabase.rpc("get_product_service", {
      p_product_id: product_id,
      p_merchant_id: merchantId, // Optional merchant ID check
    });

    if (error) {
      logError(error, "getProduct_service RPC", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to retrieve product",
            error.message,
          ),
        );
    }

    if (!data || data.length === 0) {
      // This could mean not found OR no access if the INVOKER function filters correctly
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.PRODUCT_NOT_FOUND,
            "Product not found or access denied",
          ),
        );
    }

    return res.status(200).json({
      data: data[0], // RPC returns an array of rows
    });
  } catch (error: any) {
    logError(error, "getProduct Catch", req);
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
 * Update product details
 * Uses the service role version of update_product function
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { product_id } = req.params;
    const merchantId = req.merchantId; // Use authenticated merchant ID

    if (!product_id) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.MISSING_PARAMETER,
            "Product ID is required in path",
          ),
        );
    }

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
          ),
        );
    }

    // Validate request body against updateProductSchema
    const validationResult = updateProductSchema.safeParse(req.body);
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

    // Check if there is anything to update (schema now requires is_active)
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "No update data provided",
          ),
        );
    }

    // Call update_product_service RPC (for service role)
    // Note the updated function signature only takes p_is_active
    const { error } = await supabase.rpc("update_product_service", {
      p_product_id: product_id,
      p_merchant_id: merchantId,
      // Pass ONLY the validated is_active field
      p_is_active: updateData.is_active,
    });

    if (error) {
      logError(error, "update_product_service RPC", req);
      // Check for specific DB errors raised by the RPC
      if (error.message.includes("not found")) {
        // Checks for the RAISE EXCEPTION message
        return res
          .status(404)
          .json(
            createErrorResponse(
              404,
              ErrorCode.PRODUCT_NOT_FOUND,
              "Product not found",
            ),
          );
      }
      // Generic database error
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to update product",
            error.message,
          ),
        );
    }

    // Fetch the updated product to return it using get_product_service
    const { data: updatedProduct, error: fetchError } = await supabase.rpc(
      "get_product_service", // Use service role version
      {
        p_product_id: product_id,
        p_merchant_id: merchantId, // Optional merchant ID check
      },
    );

    if (fetchError) {
      logError(fetchError, "updateProduct -> get_product_service RPC", req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Product updated but failed to retrieve latest details",
            fetchError.message,
          ),
        );
    }

    if (!updatedProduct || updatedProduct.length === 0) {
      logError(
        "get_product_service RPC returned no data after update",
        "updateProduct",
        req,
      );
      // This case should ideally not happen if update was successful
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.PRODUCT_NOT_FOUND,
            "Product not found after update attempt",
          ),
        );
    }

    return res.status(200).json({
      data: updatedProduct[0],
    });
  } catch (error: any) {
    logError(error, "updateProduct Catch", req);
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
 * Delete product
 * Uses the service role version of delete_product function
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { product_id } = req.params;
    const merchantId = req.merchantId; // Use authenticated merchant ID

    if (!product_id) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.MISSING_PARAMETER,
            "Product ID is required in path",
          ),
        );
    }

    if (!merchantId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
          ),
        );
    }

    // Call delete_product_service RPC (for service role)
    const { error } = await supabase.rpc("delete_product_service", {
      p_product_id: product_id,
      p_merchant_id: merchantId, // For validation only
    });

    if (error) {
      logError(error, "delete_product_service RPC", req);
      // Check for specific DB errors raised by the RPC
      if (error.message.includes("not found")) {
        // Checks for the RAISE EXCEPTION message
        return res
          .status(404)
          .json(
            createErrorResponse(
              404,
              ErrorCode.PRODUCT_NOT_FOUND,
              "Product not found or does not belong to the merchant",
            ),
          );
      }
      // Generic database error
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.DATABASE_ERROR,
            "Failed to delete product",
            error.message,
          ),
        );
    }

    // Success, no content to return
    return res.status(204).send();
  } catch (error: any) {
    logError(error, "deleteProduct Catch", req);
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
