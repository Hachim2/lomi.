import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import axios from "axios"; // Import axios for HTTP requests
import { WebhookEvent } from "../types/api";

// Shared Error Handling (Assuming similar structure to transactions.controller.ts)
// If this doesn't exist, it needs to be created/imported from a shared location.
enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  WEBHOOK_DELIVERY_FAILED = "WEBHOOK_DELIVERY_FAILED",
  EDGE_FUNCTION_ERROR = "EDGE_FUNCTION_ERROR",
  EDGE_FUNCTION_HTTP_ERROR = "EDGE_FUNCTION_HTTP_ERROR",
  EDGE_FUNCTION_TIMEOUT = "EDGE_FUNCTION_TIMEOUT",
}

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

// Consistent error logging (Assuming similar structure to transactions.controller.ts)
function logError(error: any, context: string, req: Request) {
  const orgId = req.organizationId || "N/A"; // Use organizationId if available
  console.error(`Error in ${context}:`, {
    error: error.message || error,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    organizationId: orgId,
    requestBody: req.body,
    requestParams: req.params,
    requestQuery: req.query,
  });
}

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

  // Add specific mappings as needed
  if (error.message && error.message.includes("already exists")) {
    status = 409;
    code = ErrorCode.CONFLICT;
    message = "A webhook with this URL already exists for your organization";
    details = undefined; // Don't expose DB details for conflict
  } else if (error.message && error.message.includes("Permission denied")) {
    status = 403;
    code = ErrorCode.FORBIDDEN;
    message = "Permission denied for this operation.";
    details = undefined;
  }

  switch (error.code) {
    // Add more specific PostgREST/DB error code mappings if necessary
    case "PGRST116": // Resource not found
      status = 404;
      code = ErrorCode.NOT_FOUND;
      message = "Resource not found";
      break;
  }

  return createErrorResponse(status, code, message, details);
}
// End Shared Error Handling

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ""; // Get Anon key
const supabaseEdgeFunctionBase =
  process.env.SUPABASE_FUNCTIONS_URL || `${supabaseUrl}/functions/v1`; // Base URL for functions

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  authorized_events: z.array(z.nativeEnum(WebhookEvent)).min(1),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  authorized_events: z.array(z.nativeEnum(WebhookEvent)).min(1).optional(),
  is_active: z.boolean().optional(),
});

// Interface for the raw webhook data from DB (replace with generated type if available)
interface DbWebhook {
  webhook_id: string;
  organization_id: string;
  url: string;
  authorized_events?: WebhookEvent[];
  verification_token?: string; // Secret
  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  metadata?: { [key: string]: any };
}

// Type predicate to check if an object is a valid DbWebhook (and not null)
function isDbWebhook(webhook: DbWebhook | null): webhook is DbWebhook {
  return webhook !== null;
}

/**
 * Transform database webhook object to API response format
 * **Crucially, removes the secret.**
 */
function transformWebhookToResponse(webhook: DbWebhook) {
  // Ensure webhook and required fields exist
  if (
    !webhook ||
    !webhook.webhook_id ||
    !webhook.organization_id ||
    !webhook.url
  ) {
    // Handle the case where webhook data is incomplete or invalid
    console.error("Invalid webhook data for transformation:", webhook);
    // Return a default structure or null, depending on how you want to handle this
    return null; // Or throw an error, or return a structure indicating an issue
  }
  return {
    id: webhook.webhook_id,
    organization_id: webhook.organization_id,
    url: webhook.url,
    events: webhook.authorized_events || [], // Provide default empty array
    // verification_token (secret) is INTENTIONALLY omitted
    active: webhook.is_active ?? false, // Provide default if null/undefined
    created_at: webhook.created_at,
    updated_at: webhook.updated_at,
    // Optionally include description if it exists in metadata
    description: webhook.metadata?.description || undefined,
  };
}

/**
 * Retrieve merchant ID from organization ID
 */
async function getMerchantFromOrganization(
  organizationId: string,
): Promise<string | null> {
  const context = "getMerchantFromOrganization";
  // Log the organizationId being used
  console.info(
    `[${context}] Attempting to find merchant for organization ID: ${organizationId}`,
  );

  // Basic check for obviously invalid ID format before calling RPC
  // A more robust UUID validation library could be used here.
  if (
    !organizationId ||
    typeof organizationId !== "string" ||
    organizationId.length !== 36
  ) {
    console.error(
      `[${context}] Invalid organizationId format received: ${organizationId}`,
    );
    return null; // Treat invalid format as not found upstream
  }

  try {
    const { data, error } = await supabase.rpc(
      "get_merchant_from_organization",
      {
        p_organization_id: organizationId,
      },
    );

    if (error) {
      // Log the *specific* Supabase error
      console.error(
        `[${context}] Supabase RPC error for org ${organizationId}:`,
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      );
      return null;
    }

    if (!data) {
      // Log if RPC succeeded but returned no data (merchant truly not found)
      console.info(
        `[${context}] No merchant found for organization ID: ${organizationId}`,
      );
      return null;
    }

    console.info(
      `[${context}] Found merchant for organization ID: ${organizationId}`,
    );
    return data; // Assuming RPC returns just the merchant UUID string
  } catch (error: any) {
    // Catch unexpected exceptions during the call
    console.error(
      `[${context}] Exception during RPC call for org ${organizationId}:`,
      error,
    );
    return null;
  }
}

// --- Helper Function to Map API Enum to DB Enum ---
const apiToDbWebhookEventMap: { [key in WebhookEvent]: string } = {
  [WebhookEvent.PAYMENT_CREATED]: "payment.created",
  [WebhookEvent.PAYMENT_SUCCEEDED]: "payment.succeeded",
  [WebhookEvent.PAYMENT_FAILED]: "payment.failed",
  [WebhookEvent.REFUND_CREATED]: "refund.created",
  [WebhookEvent.REFUND_COMPLETED]: "refund.completed",
  [WebhookEvent.SUBSCRIPTION_CREATED]: "subscription.created",
  [WebhookEvent.SUBSCRIPTION_RENEWED]: "subscription.renewed",
  [WebhookEvent.SUBSCRIPTION_CANCELED]: "subscription.canceled",
  [WebhookEvent.CHECKOUT_COMPLETED]: "checkout.completed",
  [WebhookEvent.PROVIDER_STATUS_CHANGED]: "provider.status_changed",
};

function transformApiEventsToDbEvents(apiEvents: WebhookEvent[]): string[] {
  return apiEvents.map((event) => apiToDbWebhookEventMap[event] || event);
  // Fallback to original event if somehow not in map (shouldn't happen with zod validation)
}
// --- End Helper Function ---

/**
 * List all webhooks for the authenticated organization
 */
export const listWebhooks = async (req: Request, res: Response) => {
  const context = "listWebhooks";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
    }

    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
    }

    // Use Supabase RPC function to fetch webhooks
    const { data: webhooks, error } = await supabase.rpc(
      "fetch_organization_webhooks", // Assuming this function filters by merchant_id correctly
      {
        p_merchant_id: merchantId,
      },
    );

    if (error) {
      // Use standardized handler
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    const transformedWebhooks = (webhooks || [])
      .map(transformWebhookToResponse)
      .filter(isDbWebhook); // Use type predicate filter

    res.json({
      data: transformedWebhooks,
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while listing webhooks.",
        ),
      );
  }
};

/**
 * Create a new webhook for the authenticated organization
 */
export const createWebhook = async (req: Request, res: Response) => {
  const context = "createWebhook";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      // Log the absence of organizationId
      console.warn(
        `[${context}] Unauthorized attempt: Organization ID not found in request.`,
      );
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
    }
    // Log the received organizationId
    console.info(
      `[${context}] Received request for organization ID: ${organizationId}`,
    );

    // Validate request body
    const validationResult = createWebhookSchema.safeParse(req.body);

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

    const { url, authorized_events, description } = validationResult.data;

    // --- Transformation Step ---
    const dbEvents = transformApiEventsToDbEvents(authorized_events);
    // --- End Transformation ---

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
    }

    // Call Supabase RPC function to create webhook
    // We expect this function to return the webhook_id
    const { data: webhookId, error } = await supabase.rpc("create_webhook", {
      p_merchant_id: merchantId,
      p_organization_id: organizationId,
      p_url: url,
      p_authorized_events: dbEvents, // Use transformed events
      // Pass description within metadata JSONB object
      p_metadata: description ? { description } : null,
    });

    if (error || !webhookId) {
      // Use standardized handler, which checks for specific DB errors like conflict
      return res
        .status(500)
        .json(
          handleDatabaseError(
            error || new Error("Webhook ID not returned from create_webhook"),
            req,
            context,
          ),
        );
    }

    // Fetch the newly created webhook to get all details, including the secret
    const { data: newWebhookData, error: fetchError } = await supabase.rpc(
      "get_webhook", // Use get_webhook which should return the full row including secret
      {
        p_webhook_id: webhookId, // Use the returned ID
        p_merchant_id: merchantId, // Filter by merchant to ensure ownership
      },
    );

    if (fetchError || !newWebhookData || newWebhookData.length === 0) {
      logError(
        fetchError || new Error("Newly created webhook not found"),
        context,
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Failed to fetch created webhook after creation.",
          ),
        );
    }

    const createdWebhook = newWebhookData[0];
    const webhookSecret = createdWebhook.verification_token; // Extract the secret

    // Transform the response *without* the secret for the standard body
    const responseData = transformWebhookToResponse(createdWebhook);
    if (!responseData) {
      logError(
        new Error("Failed to transform newly created webhook"),
        context,
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Internal error processing webhook data.",
          ),
        );
    }

    // Return 201 Created, including the secret *only* in this response
    res.status(201).json({
      data: responseData,
      secret: webhookSecret, // Include the secret here
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while creating the webhook.",
        ),
      );
  }
};

/**
 * Get a specific webhook by ID
 */
export const getWebhook = async (req: Request, res: Response) => {
  const context = "getWebhook";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
    }
    const webhookId = req.params.id; // Assuming ID is in path params

    // Basic validation for webhookId format (e.g., UUID) could be added here
    if (!webhookId || typeof webhookId !== "string") {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID format.",
          ),
        );
    }

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
    }

    // Use RPC function to get webhook, filtering by merchant ID
    const { data: webhookData, error } = await supabase.rpc("get_webhook", {
      p_webhook_id: webhookId,
      p_merchant_id: merchantId, // Ensure we only get webhooks for this merchant
    });

    if (error) {
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    if (!webhookData || webhookData.length === 0) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ErrorCode.NOT_FOUND, "Webhook not found."),
        );
    }

    const responseData = transformWebhookToResponse(webhookData[0]);
    if (!responseData) {
      logError(new Error("Failed to transform webhook"), context, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Internal error processing webhook data.",
          ),
        );
    }

    res.json({
      data: responseData, // Secret is removed by transformWebhookToResponse
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while fetching the webhook.",
        ),
      );
  }
};

/**
 * Update a webhook
 */
export const updateWebhook = async (req: Request, res: Response) => {
  const context = "updateWebhook";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
    }
    const webhookId = req.params.id;
    if (!webhookId || typeof webhookId !== "string") {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID format.",
          ),
        );
    }

    // Validate request body
    const validationResult = updateWebhookSchema.safeParse(req.body);

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

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
    }

    // The controller pre-check using get_webhook is removed because
    // the update_webhook RPC now handles merchant_id authorization.

    const { url, authorized_events, is_active, description } =
      validationResult.data;

    // --- Transformation Step (only if authorized_events is provided) ---
    let dbEvents: string[] | undefined = undefined;
    if (authorized_events) {
      dbEvents = transformApiEventsToDbEvents(authorized_events);
    }
    // --- End Transformation ---

    // Call Supabase RPC function to update webhook, now passing merchantId
    const { data: updated, error } = await supabase.rpc("update_webhook", {
      p_webhook_id: webhookId,
      p_merchant_id: merchantId, // Pass merchantId for authorization in RPC
      p_url: url,
      p_authorized_events: dbEvents, // Use transformed events (or null/undefined if not updating)
      p_is_active: is_active,
      // Pass description within metadata JSONB object
      p_metadata: description ? { description } : null,
    });

    if (error) {
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // The RPC returns boolean `true` if update happened, `false` if row not found/not owned.
    if (!updated) {
      // This implies webhook wasn't found OR didn't belong to the merchant
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Webhook not found or permission denied.",
          ),
        );
    }

    // Fetch the updated webhook to return it (optional, could just return 200 OK)
    const { data: webhookData, error: getError } = await supabase.rpc(
      "get_webhook",
      {
        p_webhook_id: webhookId,
        p_merchant_id: merchantId,
      },
    );

    if (getError || !webhookData || webhookData.length === 0) {
      logError(
        getError || new Error("Updated webhook not found after update"),
        context,
        req,
      );
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Failed to fetch updated webhook details.",
          ),
        );
    }

    const responseData = transformWebhookToResponse(webhookData[0]);
    if (!responseData) {
      logError(new Error("Failed to transform updated webhook"), context, req);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ErrorCode.INTERNAL_ERROR,
            "Internal error processing webhook data.",
          ),
        );
    }

    res.json({
      data: responseData, // Secret is removed by transformWebhookToResponse
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while updating the webhook.",
        ),
      );
  }
};

/**
 * Delete a webhook
 */
export const deleteWebhook = async (req: Request, res: Response) => {
  const context = "deleteWebhook";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
    }
    const webhookId = req.params.id;
    if (!webhookId || typeof webhookId !== "string") {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID format.",
          ),
        );
    }

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
    }

    // Controller pre-check removed, RPC handles authorization

    // Call Supabase RPC function to delete webhook, passing merchantId
    const { data: deleted, error } = await supabase.rpc("delete_webhook", {
      p_webhook_id: webhookId,
      p_merchant_id: merchantId, // Pass merchantId for authorization
    });

    if (error) {
      return res.status(500).json(handleDatabaseError(error, req, context));
    }

    // RPC returns boolean true if deleted, false if not found/not owned
    if (!deleted) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Webhook not found or permission denied.",
          ),
        );
    }

    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while deleting the webhook.",
        ),
      );
  }
};

/**
 * Test webhook by sending a test event
 */
export async function testWebhook(req: Request, res: Response): Promise<void> {
  const context = "testWebhook";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
      return;
    }
    const webhookId = req.params.id;
    if (!webhookId || typeof webhookId !== "string") {
      res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID format.",
          ),
        );
      return;
    }

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
      return;
    }

    // Instead of calling the SQL RPC, call the Supabase Edge Function
    const edgeFunctionUrl = `${supabaseEdgeFunctionBase}/test_webhook`;

    try {
      const functionResponse = await axios.post(
        edgeFunctionUrl,
        {
          webhook_id: webhookId,
          merchant_id: merchantId, // Pass merchantId for authorization within the function
        },
        {
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`, // Use Anon Key for Edge Function auth
            "Content-Type": "application/json",
          },
          timeout: 15000, // Add a timeout (e.g., 15 seconds)
        },
      );

      // Check the status code from the edge function itself
      if (functionResponse.status === 200 && functionResponse.data.success) {
        // Success: The edge function successfully sent the test webhook
        res.json({
          data: {
            success: true,
            message: "Test webhook sent successfully.",
            webhook_id: webhookId,
            details: `Webhook endpoint responded with status ${functionResponse.data.status}.`,
            log_id: functionResponse.data.log_id, // Include log_id if returned by function
          },
        });
      } else if (
        functionResponse.status === 200 &&
        !functionResponse.data.success
      ) {
        // Failure: The edge function ran, but the webhook endpoint failed
        res.status(400).json(
          // Use 400 or maybe 502 Bad Gateway? 400 seems reasonable.
          createErrorResponse(
            400, // Use the status reported by the function? or a generic failure code?
            "WEBHOOK_DELIVERY_FAILED",
            `Test webhook sent, but endpoint failed with status ${functionResponse.data.status}.`,
            {
              log_id: functionResponse.data.log_id,
              response_preview: functionResponse.data.response,
            },
          ),
        );
      } else {
        // Handle cases where the function itself returned an error status (e.g., 404, 500)
        logError(
          new Error(
            `Edge function call failed with status ${functionResponse.status}`,
          ),
          context,
          req,
        );
        res.status(functionResponse.status).json(
          createErrorResponse(
            functionResponse.status,
            "EDGE_FUNCTION_ERROR",
            `Failed to execute test webhook function: ${functionResponse.data?.error || "Unknown error"}`,
            functionResponse.data, // Include details from the function response if available
          ),
        );
      }
    } catch (axiosError: any) {
      logError(axiosError, `${context} (Axios Call to Edge Function)`, req);
      let status = 500;
      let code = ErrorCode.INTERNAL_ERROR;
      let message = "Failed to call the test webhook function.";
      let details: any = { functionUrl: edgeFunctionUrl };

      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        status = axiosError.response.status;
        code = ErrorCode.EDGE_FUNCTION_HTTP_ERROR;
        message = `Test webhook function responded with error status ${status}.`;
        details.responseData = axiosError.response.data;
      } else if (axiosError.request) {
        // The request was made but no response was received
        status = 504; // Gateway Timeout
        code = ErrorCode.EDGE_FUNCTION_TIMEOUT;
        message =
          "No response received from the test webhook function (timeout).";
      } else {
        // Something happened in setting up the request that triggered an Error
        message = `Error setting up request to test webhook function: ${axiosError.message}`;
      }

      res
        .status(status)
        .json(createErrorResponse(status, code, message, details));
    }
  } catch (error: any) {
    // Catch errors from initial setup (e.g., getting merchantId)
    logError(error, `${context} (Initial Setup)`, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred before testing the webhook.",
        ),
      );
  }
}

/**
 * Retrieve webhook delivery logs for a specific webhook
 */
export async function getWebhookDeliveryLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const context = "getWebhookDeliveryLogs";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
      return;
    }
    const webhookId = req.params.id;
    if (!webhookId || typeof webhookId !== "string") {
      res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID format.",
          ),
        );
      return;
    }

    // Parse query parameters for filtering and pagination
    // Adding default values and basic validation
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 25),
    ); // Clamp limit 1-100
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const successOnly = req.query.success === "true";
    const failedOnly = req.query.failed === "true";

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
      return;
    }

    // Assuming get_webhook_delivery_logs RPC handles merchant_id authorization or we add it.
    // For now, we rely on the RPC filtering or add a pre-check like others if needed.
    // Let's assume the RPC needs merchant_id:
    const { data: logs, error } = await supabase.rpc(
      "get_webhook_delivery_logs",
      {
        p_webhook_id: webhookId,
        p_merchant_id: merchantId, // Assuming RPC needs this for authorization
        p_success_only: successOnly,
        p_failed_only: failedOnly,
        p_limit: limit,
        p_offset: offset,
      },
    );

    if (error) {
      res.status(500).json(handleDatabaseError(error, req, context));
      return;
    }

    // Format the response (Ensure log properties match actual RPC return)
    const formattedLogs = (logs || []).map((log: any) => ({
      id: log.log_id,
      webhook_id: log.webhook_id,
      event_type: log.event_type,
      attempt_number: log.attempt_number,
      success: log.success,
      response_status: log.response_status,
      // Consider omitting or truncating response_body for brevity/security
      // response_body: log.response_body ? JSON.stringify(log.response_body).substring(0, 200) + '...' : null,
      response_body_truncated: log.response_body ? true : false, // Indicate if body exists
      request_duration_ms: log.request_duration_ms,
      created_at: log.created_at,
      // Omit payload by default unless specifically requested? It can be large.
      // payload: log.payload,
      payload_present: log.payload ? true : false, // Indicate if payload exists
    }));

    // We need a way to get the total count for proper pagination meta
    // This might require a separate count RPC or modifying the existing one
    const totalCount = logs ? logs.length : 0; // Placeholder - incorrect for pagination

    res.json({
      data: formattedLogs,
      meta: {
        // total: totalCount, // Needs accurate count from DB
        limit,
        offset,
      },
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while retrieving webhook delivery logs.",
        ),
      );
  }
}

/**
 * Retry a specific webhook delivery
 * CONSIDER: Is this needed for the public merchant API?
 */
export async function retryWebhookDelivery(
  req: Request,
  res: Response,
): Promise<void> {
  const context = "retryWebhookDelivery";
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ErrorCode.UNAUTHORIZED,
            "Organization ID not found in request.",
          ),
        );
      return;
    }
    const webhookId = req.params.id;
    const logId = req.params.logId; // Assuming log ID is in path params

    if (
      !webhookId ||
      typeof webhookId !== "string" ||
      !logId ||
      typeof logId !== "string"
    ) {
      res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ErrorCode.INVALID_REQUEST,
            "Invalid Webhook ID or Log ID format.",
          ),
        );
      return;
    }

    // Get merchant ID for this organization
    const merchantId = await getMerchantFromOrganization(organizationId);
    if (!merchantId) {
      res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Merchant account not found for this organization.",
          ),
        );
      return;
    }

    // Assuming retry_webhook_delivery RPC handles merchant_id authorization or we add it.
    // Let's assume the RPC needs merchant_id:
    const { data: retrySuccessful, error } = await supabase.rpc(
      "retry_webhook_delivery",
      {
        p_webhook_id: webhookId,
        p_log_id: logId,
        p_merchant_id: merchantId, // Assuming RPC needs this for authorization
      },
    );

    if (error) {
      res.status(500).json(handleDatabaseError(error, req, context));
      return;
    }

    // RPC returns boolean true if retry was initiated, false otherwise
    if (!retrySuccessful) {
      res
        .status(404)
        .json(
          createErrorResponse(
            404,
            ErrorCode.NOT_FOUND,
            "Webhook delivery log not found, not failed, or permission denied.",
          ),
        );
      return;
    }

    res.json({
      data: {
        success: true,
        message: "Webhook delivery queued for retry",
        webhook_id: webhookId,
        log_id: logId,
      },
    });
  } catch (error: any) {
    logError(error, context, req);
    res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ErrorCode.INTERNAL_ERROR,
          "An unexpected error occurred while retrying webhook delivery.",
        ),
      );
  }
}
