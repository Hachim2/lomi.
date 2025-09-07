import { Request, Response, NextFunction } from "express";
import { WebhookEvent } from "../types/api";
import { TransactionStatus, SubscriptionStatus } from "../types/api";
import { notifyTransactionEvent } from "../services/webhook-sender";

// Extend the Express Request interface to include organizationId
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}

/**
 * Enum for database webhook events
 */
export enum DatabaseWebhookEvent {
  PAYMENT_CREATED = "payment.created",
  PAYMENT_SUCCEEDED = "payment.succeeded",
  PAYMENT_FAILED = "payment.failed",
  REFUND_CREATED = "refund.created",
  REFUND_COMPLETED = "refund.completed",
  SUBSCRIPTION_CREATED = "subscription.created",
  SUBSCRIPTION_RENEWED = "subscription.renewed",
  SUBSCRIPTION_CANCELED = "subscription.canceled",
  CHECKOUT_COMPLETED = "checkout.completed",
  PROVIDER_STATUS_CHANGED = "provider.status_changed",
}

/**
 * Maps a transaction status to the corresponding database webhook event
 */
export const mapTransactionStatusToDbEvent = (
  status: TransactionStatus,
): DatabaseWebhookEvent => {
  switch (status) {
    case "pending":
      return DatabaseWebhookEvent.PAYMENT_CREATED;
    case "completed":
      return DatabaseWebhookEvent.PAYMENT_SUCCEEDED;
    case "failed":
      return DatabaseWebhookEvent.PAYMENT_FAILED;
    case "refunded":
      return DatabaseWebhookEvent.REFUND_COMPLETED;
    case "expired":
      return DatabaseWebhookEvent.CHECKOUT_COMPLETED;
    default:
      return DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED;
  }
};

/**
 * Maps a subscription status to the corresponding database webhook event
 */
export const mapSubscriptionStatusToDbEvent = (
  status: SubscriptionStatus,
  isNew: boolean = false,
): DatabaseWebhookEvent => {
  if (isNew) {
    return DatabaseWebhookEvent.SUBSCRIPTION_CREATED;
  }

  switch (status) {
    case "active":
      return DatabaseWebhookEvent.SUBSCRIPTION_RENEWED;
    case "cancelled":
      return DatabaseWebhookEvent.SUBSCRIPTION_CANCELED;
    case "paused":
    case "expired":
    case "past_due":
    case "trial":
      return DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED;
    default:
      return DatabaseWebhookEvent.PROVIDER_STATUS_CHANGED;
  }
};

/**
 * Maps a transaction status to the API webhook event
 */
export const mapTransactionStatusToEvent = (
  status: TransactionStatus,
): WebhookEvent => {
  switch (status) {
    case "pending":
      return WebhookEvent.PAYMENT_CREATED;
    case "completed":
      return WebhookEvent.PAYMENT_SUCCEEDED;
    case "failed":
      return WebhookEvent.PAYMENT_FAILED;
    case "refunded":
      return WebhookEvent.REFUND_COMPLETED;
    case "expired":
      return WebhookEvent.CHECKOUT_COMPLETED; // No direct mapping, using closest
    default:
      return WebhookEvent.PAYMENT_CREATED; // Default fallback
  }
};

/**
 * Maps a subscription status to the API webhook event
 */
export const mapSubscriptionStatusToEvent = (
  status: SubscriptionStatus,
  isNew: boolean = false,
): WebhookEvent => {
  if (isNew) {
    return WebhookEvent.SUBSCRIPTION_CREATED;
  }

  switch (status) {
    case "active":
      return WebhookEvent.SUBSCRIPTION_RENEWED;
    case "cancelled":
      return WebhookEvent.SUBSCRIPTION_CANCELED;
    default:
      return WebhookEvent.SUBSCRIPTION_CREATED; // Default fallback
  }
};

/**
 * Extract response data from the response body
 */
function extractResponseData(body: any): any {
  if (!body) return null;

  // If body is string, parse it
  const responseData = typeof body === "string" ? JSON.parse(body) : body;

  // Return data if it exists
  return responseData && responseData.data ? responseData.data : null;
}

/**
 * Middleware that listens for transaction status changes in API responses
 * and triggers appropriate webhooks asynchronously
 */
export const webhookListener = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Store the original send method
  const originalSend = res.send;

  // Override the send method to intercept the response
  res.send = function (body?: any): Response {
    // Process the response only if it's a success
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const responseData = extractResponseData(body);

        // No data to process
        if (!responseData) {
          return originalSend.call(this, body);
        }

        // Get organization_id for webhook notifications
        const organizationId =
          responseData.organization_id || req.organizationId;
        if (!organizationId) {
          return originalSend.call(this, body);
        }

        // Handle transaction events
        if (
          responseData.transaction ||
          (responseData.id &&
            responseData.status &&
            responseData.transaction_type)
        ) {
          const transaction = responseData.transaction || responseData;
          if (transaction.status && transaction.id) {
            const event = mapTransactionStatusToEvent(transaction.status);

            // Trigger webhook notification asynchronously
            setTimeout(() => {
              notifyTransactionEvent(organizationId, event, transaction).catch(
                (error) => {
                  console.error("Failed to send webhook notification:", error);
                },
              );
            }, 0);
          }
        }
        // Handle subscription events
        else if (
          responseData.subscription ||
          (responseData.id && responseData.status && responseData.plan_id)
        ) {
          const subscription = responseData.subscription || responseData;
          if (subscription.status && subscription.id) {
            // Check if this is a new subscription (POST request)
            const isNewSubscription = req.method === "POST";
            const event = mapSubscriptionStatusToEvent(
              subscription.status,
              isNewSubscription,
            );

            // Trigger webhook notification asynchronously
            setTimeout(() => {
              notifyTransactionEvent(organizationId, event, subscription).catch(
                (error) => {
                  console.error(
                    "Failed to send subscription webhook notification:",
                    error,
                  );
                },
              );
            }, 0);
          }
        }
        // Handle refund events
        else if (
          responseData.refund ||
          (responseData.id &&
            responseData.status &&
            responseData.transaction_id)
        ) {
          const refund = responseData.refund || responseData;
          if (refund.status && refund.id) {
            const event =
              refund.status === "completed"
                ? WebhookEvent.REFUND_COMPLETED
                : WebhookEvent.REFUND_CREATED;

            // Trigger webhook notification asynchronously
            setTimeout(() => {
              notifyTransactionEvent(organizationId, event, refund).catch(
                (error) => {
                  console.error(
                    "Failed to send refund webhook notification:",
                    error,
                  );
                },
              );
            }, 0);
          }
        }
        // Handle checkout session completion
        else if (
          responseData.checkout_session ||
          (responseData.id && responseData.status === "completed")
        ) {
          const checkoutSession = responseData.checkout_session || responseData;
          if (checkoutSession.status === "completed" && checkoutSession.id) {
            // Trigger webhook notification asynchronously
            setTimeout(() => {
              notifyTransactionEvent(
                organizationId,
                WebhookEvent.CHECKOUT_COMPLETED,
                checkoutSession,
              ).catch((error) => {
                console.error(
                  "Failed to send checkout webhook notification:",
                  error,
                );
              });
            }, 0);
          }
        }
      } catch (error) {
        // Just log the error, don't disrupt the response
        console.error("Error processing response for webhooks:", error);
      }
    }

    // Call the original send method and return its result
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Middleware specifically for subscription-related routes that checks
 * for status changes to trigger webhooks
 */
export const subscriptionWebhookListener = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only check PATCH or PUT requests which modify subscriptions
  if (
    (req.method === "PATCH" || req.method === "PUT") &&
    req.path.includes("/subscriptions/")
  ) {
    // Extract the subscription ID from the URL
    const subscriptionId = req.path.split("/").pop();

    // Store the original status if we're updating a subscription
    const originalStatus = req.body && req.body.status;

    // After the request completes, check if the status changed
    res.on("finish", () => {
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        originalStatus &&
        subscriptionId &&
        req.organizationId
      ) {
        const event = mapSubscriptionStatusToEvent(originalStatus);

        // We need to fetch the updated subscription to get all its details
        // For demo purposes, we're creating a minimal subscription object
        const subscription = {
          id: subscriptionId,
          organization_id: req.organizationId,
          status: originalStatus,
        };

        // Trigger webhook notification asynchronously
        setTimeout(() => {
          notifyTransactionEvent(
            req.organizationId as string,
            event,
            subscription as any,
          ).catch((error) => {
            console.error("Failed to send webhook notification:", error);
          });
        }, 0);
      }
    });
  }

  next();
};

/**
 * Middleware specifically for refund-related routes
 */
export const refundWebhookListener = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only check PATCH or PUT requests which modify refunds
  if (
    (req.method === "PATCH" || req.method === "PUT") &&
    req.path.includes("/refunds/")
  ) {
    // Extract the refund ID from the URL
    const refundId = req.path.split("/").pop();

    // Store the original status if we're updating a refund
    const originalStatus = req.body && req.body.status;

    // After the request completes, check if the status changed
    res.on("finish", () => {
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        originalStatus &&
        refundId &&
        req.organizationId
      ) {
        const event =
          originalStatus === "completed"
            ? WebhookEvent.REFUND_COMPLETED
            : WebhookEvent.REFUND_CREATED;

        // We need to fetch the updated refund to get all its details
        // For demo purposes, we're creating a minimal refund object
        const refund = {
          id: refundId,
          organization_id: req.organizationId,
          status: originalStatus,
        };

        // Trigger webhook notification asynchronously
        setTimeout(() => {
          notifyTransactionEvent(
            req.organizationId as string,
            event,
            refund as any,
          ).catch((error) => {
            console.error("Failed to send webhook notification:", error);
          });
        }, 0);
      }
    });
  }

  next();
};

/**
 * Manually trigger a webhook event for a transaction
 */
export const triggerWebhookEvent = async (
  transactionId: string,
  organizationId: string,
  event: WebhookEvent,
) => {
  // Fetch the transaction from the database
  // For demo purposes, we're creating a minimal transaction object
  const transaction = {
    id: transactionId,
    organization_id: organizationId,
    status:
      event === WebhookEvent.PAYMENT_SUCCEEDED
        ? "completed"
        : event === WebhookEvent.PAYMENT_FAILED
          ? "failed"
          : event === WebhookEvent.PAYMENT_CREATED
            ? "pending"
            : event === WebhookEvent.REFUND_COMPLETED
              ? "refunded"
              : event === WebhookEvent.CHECKOUT_COMPLETED
                ? "expired"
                : "pending",
  };

  // Notify all webhooks for this organization about the event
  await notifyTransactionEvent(organizationId, event, transaction as any);
};
