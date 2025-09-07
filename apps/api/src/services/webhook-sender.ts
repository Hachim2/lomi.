import axios from "axios";
import * as crypto from "crypto";
import * as winston from "winston";
import { createClient } from "@supabase/supabase-js";
import { WebhookEvent, Webhook } from "../types/api";
import { Transaction } from "../types/api";
import { DatabaseWebhookEvent } from "../middleware/webhook-listener";

// Helper to add timeout to RPC calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

// Interface for webhook delivery result used by sendTestWebhook
interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  retryable: boolean;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection': 'close', // Prevent connection pooling issues
    },
  },
});

// Configure logger
const transports: winston.transport[] = [new winston.transports.Console()];

// Only add file transports when not in production (not on Vercel)
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({
      filename: "logs/webhook-errors.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "logs/webhooks.log" }),
  );
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "webhook-sender" },
  transports,
});

export { logger }; // Export the logger instance

/**
 * Prepares the webhook payload based on the event type and data
 */
export const prepareWebhookPayload = (event: WebhookEvent, data: any): any => {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    event,
    timestamp,
    data,
    lomi_environment: process.env.NODE_ENV || "development",
  };
};

/**
 * Generates a signature for the webhook payload using the webhook secret
 */
export const generateSignature = (payloadString: string, secret: string): string => {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
};

/**
 * Sends a webhook to the specified URL with retry logic
 */
export const sendWebhook = async (
  webhook: Webhook,
  event: WebhookEvent,
  data: any,
  maxRetries = 3,
  retryDelay = 5000,
): Promise<boolean> => {
  logger.info({
    message: "Attempting to send webhook",
    webhookId: webhook.id,
    event,
    url: webhook.url,
    subscribedEvents: webhook.events,
    active: webhook.active
  });

  // Skip if webhook doesn't subscribe to this event
  if (
    !webhook.events ||
    !Array.isArray(webhook.events) ||
    !webhook.events.includes(event)
  ) {
    logger.info({
      message: `Webhook doesn't subscribe to event`,
      webhookId: webhook.id,
      event,
      subscribedEvents: webhook.events
    });
    return false;
  }

  // Skip if webhook is not active
  if (!webhook.active) {
    logger.info({
      message: `Webhook is not active`,
      webhookId: webhook.id
    });
    return false;
  }

  const payload = prepareWebhookPayload(event, data);
  // Stringify the payload ONCE to ensure the signature is based on the exact string being sent.
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret as string);

  let retries = 0;
  let lastResponseStatus: number | undefined;
  let lastResponseBody: any;

  while (retries <= maxRetries) {
    try {
      // Send the stringified payload directly.
      const response = await axios.post(webhook.url as string, payloadString, {
        headers: {
          "Content-Type": "application/json",
          "X-Lomi-Signature": signature,
          "X-Lomi-Event": event,
          "User-Agent": "Lomi-Webhook/1.0",
        },
        timeout: 10000, // 10 second timeout
      });

      lastResponseStatus = response.status;
      lastResponseBody = response.data;

      if (response.status >= 200 && response.status < 300) {
        // Update webhook delivery status in database
        try {
          await updateWebhookDeliveryStatus(
            webhook.id as string,
            response.status,
            typeof lastResponseBody === 'string' ? lastResponseBody : JSON.stringify(lastResponseBody),
            payload,
          );
        } catch (updateError) {
          logger.error({
            message: "Failed to update webhook delivery status",
            webhookId: webhook.id,
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
          });
        }

        logger.info({
          message: "Webhook delivered successfully",
          webhookId: webhook.id,
          event,
          url: webhook.url,
          statusCode: response.status,
        });
        return true;
      }

      logger.warn({
        message: `Webhook delivery failed with status ${response.status}`,
        webhookId: webhook.id,
        event,
        url: webhook.url,
        statusCode: response.status,
        responseBody: lastResponseBody,
        retry: retries + 1,
      });
    } catch (error: any) {
      lastResponseStatus = error.response?.status;
      lastResponseBody = error.response?.data || error.message || "Unknown error";

      logger.error({
        message: "Webhook delivery error",
        webhookId: webhook.id,
        event,
        url: webhook.url,
        error: error.message,
        statusCode: lastResponseStatus,
        responseBody: lastResponseBody,
        retry: retries + 1,
      });
    }

    retries++;

    if (retries <= maxRetries) {
      // Wait before retrying with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, retries - 1)),
      );
    }
  }

  // Update webhook delivery status with failure after max retries
  try {
    await updateWebhookDeliveryStatus(
      webhook.id as string,
      lastResponseStatus || 0,
      typeof lastResponseBody === 'string' ? lastResponseBody : JSON.stringify(lastResponseBody),
      payload,
    );
  } catch (updateError) {
    logger.error({
      message: "Failed to update webhook delivery status after retries",
      webhookId: webhook.id,
      error:
        updateError instanceof Error
          ? updateError.message
          : String(updateError),
    });
  }

  logger.error({
    message: "Webhook delivery failed after maximum retries",
    webhookId: webhook.id,
    event,
    url: webhook.url,
    maxRetries,
  });

  return false;
};

/**
 * Notifies all organization webhooks about a transaction event
 */
export const notifyTransactionEvent = async (
  organizationId: string,
  event: WebhookEvent,
  transaction: Transaction,
): Promise<void> => {
  try {
    logger.info({
      message: "Starting notifyTransactionEvent",
      organizationId,
      event,
      transactionId: transaction.id,
    });

    // Fetch all active webhooks for this organization
    const webhooks = await fetchOrganizationWebhooks(organizationId, event);

    logger.info({
      message: "Fetched webhooks for organization",
      organizationId,
      event,
      webhookCount: webhooks.length,
      webhooks: webhooks.map(w => ({ id: w.id, url: w.url, events: w.events }))
    });

    if (webhooks.length === 0) {
      logger.warn({
        message: `No webhooks configured for event ${event}`,
        organizationId,
        event,
      });
      return;
    }

    // Send the webhook to each configured endpoint
    const results = await Promise.allSettled(
      webhooks.map((webhook) => sendWebhook(webhook, event, transaction)),
    );

    // Log results
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    const failed = webhooks.length - successful;

    logger.info({
      message: `Sent ${event} webhooks for transaction ${transaction.id}`,
      transactionId: transaction.id,
      organizationId,
      successful,
      failed,
    });
  } catch (error: any) {
    logger.error({
      message: "Failed to notify webhooks",
      error: error.message,
      organizationId,
      event,
      transactionId: transaction.id,
    });
  }
};

/**
 * Update webhook delivery status in the database
 */
async function updateWebhookDeliveryStatus(
  webhookId: string,
  responseStatus: number,
  responseBody: string,
  payload: any,
): Promise<void> {
  try {
    // Use the new log_webhook_delivery function instead of update_webhook_delivery_status
    const { error } = await supabase.rpc("log_webhook_delivery", {
      p_webhook_id: webhookId,
      p_merchant_id: payload.data?.merchant_id || payload.data?.organization_id,
      p_organization_id: payload.data?.organization_id,
      p_event_type: payload.event,
      p_payload: payload,
      p_response_status: responseStatus,
      p_response_body: responseBody,
      p_attempt_number: 1, // Initial attempt
      p_headers: null, // We don't have the headers in this context
      p_request_duration_ms: null, // We don't track duration in this implementation
    });

    if (error) {
      throw new Error(`Failed to log webhook delivery: ${error.message}`);
    }
  } catch (error) {
    // Log error using Winston logger
    logger.error({
        message: "Error updating webhook delivery status",
        webhookId: webhookId,
        error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Fetch all webhooks for an organization that are subscribed to a specific event
 */
async function fetchOrganizationWebhooks(
  organizationId: string,
  event?: WebhookEvent,
): Promise<Webhook[]> {
  try {
    logger.info({
      message: "Fetching webhooks for organization",
      organizationId,
      event
    });

    // Get the merchant ID from the organization using RPC
    const { data: merchantId, error: merchantError } = await supabase.rpc(
      "get_merchant_from_organization",
      {
        p_organization_id: organizationId,
      },
    );

    if (merchantError || !merchantId) {
      logger.error({
        message: "No merchant found for organization",
        organizationId,
        error: merchantError?.message,
        merchantError
      });
      return [];
    }

    logger.info({
      message: "Found merchant for organization",
      organizationId,
      merchantId
    });

    // Convert our WebhookEvent to the database's webhook_event enum
    const dbEvent = event ? mapWebhookEventToDbEnum(event) : undefined;

    logger.info({
      message: "Fetching webhooks with parameters",
      merchantId,
      dbEvent,
      originalEvent: event
    });

    // Fetch webhooks using the RPC function
    const { data: webhooks, error } = await supabase.rpc(
      "fetch_organization_webhooks",
      {
        p_merchant_id: merchantId,
        p_event: dbEvent,
        p_is_active: true,
      },
    );

    if (error) {
      logger.error({
        message: "Failed to fetch webhooks",
        organizationId,
        merchantId,
        error: error.message,
        dbEvent,
        fullError: error
      });
      return [];
    }

    logger.info({
      message: "Fetched webhooks from database",
      organizationId,
      merchantId,
      webhookCount: webhooks ? webhooks.length : 0,
      webhooks: webhooks ? webhooks.map((w: any) => ({ id: w.webhook_id, url: w.url, events: w.authorized_events })) : []
    });

    if (!webhooks || webhooks.length === 0) {
      logger.warn({
        message: "No webhooks found for organization",
        organizationId,
        merchantId,
        event: dbEvent
      });
      return [];
    }

    // Map database webhooks to our Webhook interface
    const mappedWebhooks = webhooks.map((dbWebhook: any) => ({
      id: dbWebhook.webhook_id,
      organization_id: dbWebhook.organization_id,
      url: dbWebhook.url,
      events: dbWebhook.authorized_events.map(mapDbEnumToWebhookEvent),
      secret: dbWebhook.verification_token,
      active: dbWebhook.is_active,
      created_at: new Date(dbWebhook.created_at),
      updated_at: new Date(dbWebhook.updated_at),
    }));

    logger.info({
      message: "Mapped webhooks successfully",
      organizationId,
      mappedWebhookCount: mappedWebhooks.length,
      mappedWebhooks: mappedWebhooks.map((w: any) => ({ id: w.id, url: w.url, events: w.events }))
    });

    return mappedWebhooks;
  } catch (error) {
    logger.error({
      message: "Exception when fetching webhooks",
      organizationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

/**
 * Maps our WebhookEvent to the database webhook_event enum
 */
function mapWebhookEventToDbEnum(event: WebhookEvent): DatabaseWebhookEvent {
  // Since WebhookEvent now uses database format, we can directly map
  const eventString = typeof event === 'string' ? event : String(event);
  
  const mapping: Record<string, DatabaseWebhookEvent> = {
    // Direct mapping since both use dot notation now
    'payment.created': DatabaseWebhookEvent.PAYMENT_CREATED,
    'payment.succeeded': DatabaseWebhookEvent.PAYMENT_SUCCEEDED,
    'payment.failed': DatabaseWebhookEvent.PAYMENT_FAILED,
    'refund.created': DatabaseWebhookEvent.REFUND_CREATED,
    'refund.completed': DatabaseWebhookEvent.REFUND_COMPLETED,
    'subscription.created': DatabaseWebhookEvent.SUBSCRIPTION_CREATED,
    'subscription.renewed': DatabaseWebhookEvent.SUBSCRIPTION_RENEWED,
    'subscription.canceled': DatabaseWebhookEvent.SUBSCRIPTION_CANCELED,
    'checkout.completed': DatabaseWebhookEvent.CHECKOUT_COMPLETED,
    'provider.status_changed': DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED,
    
    // Legacy support for old UPPERCASE format
    'PAYMENT_CREATED': DatabaseWebhookEvent.PAYMENT_CREATED,
    'PAYMENT_SUCCEEDED': DatabaseWebhookEvent.PAYMENT_SUCCEEDED,
    'PAYMENT_FAILED': DatabaseWebhookEvent.PAYMENT_FAILED,
    'REFUND_CREATED': DatabaseWebhookEvent.REFUND_CREATED,
    'REFUND_COMPLETED': DatabaseWebhookEvent.REFUND_COMPLETED,
    'SUBSCRIPTION_CREATED': DatabaseWebhookEvent.SUBSCRIPTION_CREATED,
    'SUBSCRIPTION_RENEWED': DatabaseWebhookEvent.SUBSCRIPTION_RENEWED,
    'SUBSCRIPTION_CANCELED': DatabaseWebhookEvent.SUBSCRIPTION_CANCELED,
    'CHECKOUT_COMPLETED': DatabaseWebhookEvent.CHECKOUT_COMPLETED,
    'PROVIDER_STATUS_CHANGED': DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED,
  };

  const result = mapping[eventString];
  if (!result) {
    logger.warn({
      message: "Unknown webhook event, using default",
      event: eventString,
      availableEvents: Object.keys(mapping)
    });
    return DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED;
  }
  
  return result;
}

/**
 * Maps database webhook_event enum to our WebhookEvent
 */
function mapDbEnumToWebhookEvent(dbEvent: DatabaseWebhookEvent): WebhookEvent {
  // Handle string values from database
  const dbEventString = typeof dbEvent === 'string' ? dbEvent : String(dbEvent);
  
  const mapping: Record<string, WebhookEvent> = {
    // Direct mapping since both use dot notation now
    'payment.created': WebhookEvent.PAYMENT_CREATED,
    'payment.succeeded': WebhookEvent.PAYMENT_SUCCEEDED,
    'payment.failed': WebhookEvent.PAYMENT_FAILED,
    'refund.created': WebhookEvent.REFUND_CREATED,
    'refund.completed': WebhookEvent.REFUND_COMPLETED,
    'subscription.created': WebhookEvent.SUBSCRIPTION_CREATED,
    'subscription.renewed': WebhookEvent.SUBSCRIPTION_RENEWED,
    'subscription.canceled': WebhookEvent.SUBSCRIPTION_CANCELED,
    'checkout.completed': WebhookEvent.CHECKOUT_COMPLETED,
    'provider.status_changed': WebhookEvent.PROVIDER_STATUS_CHANGED,
  };

  const result = mapping[dbEventString];
  if (!result) {
    logger.warn({
      message: "Unknown database webhook event, using default",
      dbEvent: dbEventString,
      availableEvents: Object.keys(mapping)
    });
    return WebhookEvent.PROVIDER_STATUS_CHANGED;
  }
  
  return result;
}

/**
 * Triggers a merchant webhook for a specific transaction event.
 * Fetches the full transaction details before sending.
 */
export async function triggerMerchantWebhookForTransaction(
  entityId: string,
  organizationId: string,
  event: WebhookEvent,
): Promise<void> {
  try {
    logger.info({
      message: "Attempting to trigger merchant webhook",
      entityId,
      organizationId,
      event,
    });

    let dataForWebhook: any;

    if (event === WebhookEvent.CHECKOUT_COMPLETED) {
      const { data: rpcResponse, error: rpcError } = await supabase.rpc(
        "get_checkout_session_details_for_webhook",
        { p_checkout_session_id: entityId },
      );

      if (rpcError) {
        logger.error({
          message: "RPC error fetching CheckoutSession for webhook trigger",
          checkoutSessionId: entityId,
          organizationId,
          event,
          rpcError: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        return;
      }
      dataForWebhook = Array.isArray(rpcResponse) ? rpcResponse[0] : rpcResponse;

      if (!dataForWebhook) {
        logger.error({
          message: "CheckoutSession not found for webhook trigger after RPC call",
          checkoutSessionId: entityId,
          organizationId,
          event,
        });
        return;
      }
    } else {
      logger.info({
        message: "Calling get_transaction RPC",
        transactionId: entityId,
        organizationId,
        event,
      });

      // First get the merchant ID from the organization using RPC
      logger.info({
        message: "Fetching merchant ID for organization",
        organizationId,
        event,
      });

      try {
        logger.info({
          message: "About to call get_merchant_from_organization RPC",
          organizationId,
        });

        let rpcResult: any;
        try {
          const startTime = Date.now();
          
          // Add timeout to RPC call using Promise.race
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`get_merchant_from_organization RPC timed out after 15 seconds`)), 15000)
          );
          
          rpcResult = await Promise.race([
            supabase.rpc("get_merchant_from_organization", { p_organization_id: organizationId }),
            timeoutPromise
          ]);
          
          const duration = Date.now() - startTime;
          
          logger.info({
            message: "get_merchant_from_organization RPC completed",
            organizationId,
            duration,
            hasError: !!rpcResult.error,
            hasData: !!rpcResult.data,
            dataValue: rpcResult.data,
            errorMessage: rpcResult.error?.message,
          });
        } catch (rpcException) {
          logger.error({
            message: "get_merchant_from_organization RPC threw exception",
            organizationId,
            error: rpcException instanceof Error ? rpcException.message : String(rpcException),
            stack: rpcException instanceof Error ? rpcException.stack : undefined,
          });
          throw rpcException;
        }

        const { data: merchantId, error: merchantError } = rpcResult;

        if (merchantError) {
          logger.error({
            message: "Error from get_merchant_from_organization RPC",
            organizationId,
            error: merchantError.message,
            errorCode: merchantError.code,
            errorDetails: merchantError.details,
            errorHint: merchantError.hint,
          });
          return;
        }

        if (!merchantId) {
          logger.error({
            message: "No merchant found for organization (null/undefined returned)",
            organizationId,
            merchantIdValue: merchantId,
          });
          return;
        }

        logger.info({
          message: "Found merchant for organization, now fetching transaction",
          organizationId,
          merchantId,
          transactionId: entityId
        });

        let transactionRpcResult: any;
        try {
          const transactionStartTime = Date.now();
          
          // Add timeout to transaction RPC call using Promise.race
          const transactionTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`get_transaction RPC timed out after 15 seconds`)), 15000)
          );
          
          transactionRpcResult = await Promise.race([
            supabase.rpc("get_transaction", { 
              p_transaction_id: entityId,
              p_merchant_id: merchantId 
            }),
            transactionTimeoutPromise
          ]);
          
          const transactionDuration = Date.now() - transactionStartTime;

          logger.info({
            message: "get_transaction RPC response",
            transactionId: entityId,
            duration: transactionDuration,
            rpcError: transactionRpcResult.error ? transactionRpcResult.error.message : null,
            rpcResponseType: Array.isArray(transactionRpcResult.data) ? 'array' : typeof transactionRpcResult.data,
            rpcResponseLength: Array.isArray(transactionRpcResult.data) ? transactionRpcResult.data.length : null,
            rpcResponse: transactionRpcResult.data,
          });
        } catch (transactionRpcException) {
          logger.error({
            message: "get_transaction RPC threw exception",
            transactionId: entityId,
            merchantId,
            error: transactionRpcException instanceof Error ? transactionRpcException.message : String(transactionRpcException),
            stack: transactionRpcException instanceof Error ? transactionRpcException.stack : undefined,
          });
          throw transactionRpcException;
        }

        const { data: rpcResponse, error: rpcError } = transactionRpcResult;

        if (rpcError) {
          logger.error({
            message: "RPC error fetching Transaction for webhook trigger",
            transactionId: entityId,
            organizationId,
            event,
            rpcError: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
          });
          return;
        }
        dataForWebhook = Array.isArray(rpcResponse) ? rpcResponse[0] : rpcResponse;

        if (!dataForWebhook) {
          logger.error({
            message: "Transaction not found for webhook trigger after RPC call",
            transactionId: entityId,
            organizationId,
            event,
          });
          return;
        }
      } catch (unexpectedError) {
        logger.error({
          message: "Unexpected error during merchant/transaction fetching",
          organizationId,
          transactionId: entityId,
          error: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
          stack: unexpectedError instanceof Error ? unexpectedError.stack : undefined,
        });
        return;
      }
    }

    if (dataForWebhook.organization_id !== organizationId) {
        logger.warn({
            message: "Organization ID mismatch between function call and fetched data for webhook trigger",
            entityId: dataForWebhook.id,
            event,
            expectedOrgIdForWebhookRouting: organizationId,
            actualOrgIdInData: dataForWebhook.organization_id,
        });
    }

    logger.info({
      message: "Successfully fetched data for webhook, now notifying event",
      retrievedEntityId: dataForWebhook.id,
      organizationId,
      event,
    });

    logger.info({
      message: "About to call notifyTransactionEvent",
      organizationId,
      event,
      dataForWebhookId: dataForWebhook.id,
    });

    await notifyTransactionEvent(organizationId, event, dataForWebhook);
  } catch (error) {
    logger.error({
      message: "Error in triggerMerchantWebhookForTransaction",
      entityId,
      organizationId,
      event,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Send a test webhook event
 */
export async function sendTestWebhook(
  webhookId: string,
  merchantId: string,
): Promise<WebhookDeliveryResult> {
  try {
    // Get webhook details using RPC
    const { data: webhooks, error: rpcError } = await supabase.rpc("get_webhook", {
      p_webhook_id: webhookId,
      p_merchant_id: merchantId,
    });

    if (rpcError) {
      logger.error({
        message: "Failed to fetch webhook details for test",
        webhookId,
        merchantId,
        error: rpcError.message,
      });
      throw rpcError;
    }
    if (!webhooks || webhooks.length === 0) {
      logger.warn({
        message: "Webhook not found for test",
        webhookId,
        merchantId,
      });
      return { success: false, error: "Webhook not found", retryable: false };
    }

    const dbWebhook = webhooks[0];

    // Map dbWebhook to our Webhook interface
    const webhook: Webhook = {
        id: dbWebhook.webhook_id,
        organization_id: dbWebhook.organization_id,
        url: dbWebhook.url,
        events: dbWebhook.authorized_events.map(mapDbEnumToWebhookEvent),
        secret: dbWebhook.verification_token,
        active: dbWebhook.is_active,
        created_at: new Date(dbWebhook.created_at),
        updated_at: new Date(dbWebhook.updated_at),
    }

    // Prepare test payload
    const testPayload = prepareWebhookPayload(WebhookEvent.PAYMENT_SUCCEEDED, {
      transaction_id: `test_${Date.now()}`,
      merchant_id: merchantId,
      organization_id: webhook.organization_id, // Include org ID if available
      amount: 1000,
      currency: "XOF", // Example currency
      status: "completed",
      test: true,
      created_at: new Date().toISOString(),
    });

    // Use the existing sendWebhook logic (which includes retry)
    // But we don't need retries for a test, so call the internal sending part directly for simplicity?
    // Let's keep using sendWebhook, the retries won't hurt for a test.
    const success = await sendWebhook(webhook, WebhookEvent.PAYMENT_SUCCEEDED, testPayload.data, 0); // 0 retries for test

    // We need to construct a WebhookDeliveryResult based on the boolean returned by sendWebhook
    // This requires sendWebhook to return more details or we fetch logs. Let's adapt slightly.

    // Since sendWebhook only returns boolean, we'll simulate a result.
    // In a real scenario, we might fetch the last log entry for this webhook.
    if (success) {
        logger.info({message: "Test webhook sent successfully (or first attempt succeeded)", webhookId});
        return { success: true, statusCode: 200, retryable: false }; // Assume 200 on success
    } else {
        logger.warn({message: "Test webhook failed", webhookId});
        return { success: false, error: "Test webhook failed", retryable: false, statusCode: 500 }; // Assume failure
    }

  } catch (error: any) {
    logger.error({
      message: "Error sending test webhook",
      webhookId,
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      retryable: false,
    };
  }
}

/**
 * Retry failed webhook deliveries
 * This should be called by a scheduled job
 */
export async function retryFailedWebhooks(): Promise<number> {
  try {
    // Get webhooks that need to be retried, limiting to those with fewer than 5 retries
    const { data: retryableWebhooks, error: rpcError } = await supabase.rpc(
      "get_retryable_webhooks",
      {
        p_max_retries: 5, // This RPC function needs to exist and return the right data
      },
    );

    if (rpcError) {
      logger.error({message: "Failed to fetch retryable webhooks", error: rpcError.message});
      throw rpcError;
    }
    if (!retryableWebhooks || retryableWebhooks.length === 0) {
      logger.info("No failed webhooks to retry");
      return 0;
    }

    logger.info(`Retrying ${retryableWebhooks.length} failed webhooks`);

    // Define structure based on expected return from get_retryable_webhooks
    interface RetryableWebhook {
      webhook_id: string;
      organization_id: string;
      url: string;
      authorized_events: DatabaseWebhookEvent[];
      verification_token: string;
      is_active: boolean;
      last_payload: Record<string, any>; // Assuming the RPC returns the last payload
      retry_count?: number;
      created_at: string;
      updated_at: string;
    }

    const retryPromises = retryableWebhooks.map(
      async (dbWebhook: RetryableWebhook) => {
        try {
            // Map to Webhook interface
            const webhook: Webhook = {
                id: dbWebhook.webhook_id,
                organization_id: dbWebhook.organization_id,
                url: dbWebhook.url,
                events: dbWebhook.authorized_events.map(mapDbEnumToWebhookEvent),
                secret: dbWebhook.verification_token,
                active: dbWebhook.is_active,
                created_at: new Date(dbWebhook.created_at),
                updated_at: new Date(dbWebhook.updated_at),
            }

          // Extract the original payload and event type
          const payload = dbWebhook.last_payload;
          const event = payload?.event as WebhookEvent; // Extract event from payload
          const data = payload?.data; // Extract data from payload

          if (!event || !data) {
              logger.warn({message: "Cannot retry webhook, missing event or data in last_payload", webhookId: webhook.id});
              return false;
          }

          // Retry sending using the existing sendWebhook function
          // The retry logic is already inside sendWebhook, but we call it once here.
          // The original sendWebhook handles logging and status updates via updateWebhookDeliveryStatus
          const success = await sendWebhook(webhook, event, data);

          if (success) {
            logger.info({message: "Webhook retry successful", webhookId: webhook.id});
          } else {
            logger.warn({message: "Webhook retry attempt failed", webhookId: webhook.id, retryCount: (dbWebhook.retry_count || 0) + 1});
          }

          return success;
        } catch (error: any) {
          logger.error({message: "Error during webhook retry processing", webhookId: dbWebhook.webhook_id, error: error.message});
          // Log failure for this specific webhook retry attempt
          try {
              await updateWebhookDeliveryStatus(dbWebhook.webhook_id, 0, `Retry error: ${error.message}`, dbWebhook.last_payload || {});
          } catch (logError) {
              // ignore log error
          }
          return false;
        }
      },
    );

    const results = await Promise.all(retryPromises);
    const successCount = results.filter(Boolean).length;

    logger.info(`Completed webhook retries`, {
      total: retryableWebhooks.length,
      successful: successCount,
    });

    return successCount;
  } catch (error: any) {
    logger.error({message: "Failed to run retryFailedWebhooks job", error: error.message});
    return 0;
  }
}
