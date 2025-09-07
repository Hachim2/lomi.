import express, {
  Request,
  Response,
  NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { LomiSDK } from "./index";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { CurrencyCode, ProviderCode, TransactionStatus } from "./types/api";
import * as webhookController from "./controllers/webhook.controller";
import * as checkoutSessionsController from "./controllers/checkout-sessions.controller";
import * as merchantsController from "./controllers/merchants.controller";
import * as providersController from "./controllers/providers.controller";
import * as transactionsController from "./controllers/transactions.controller";
import * as customersController from "./controllers/customers.controller";
// import * as refundsController from "./controllers/refunds.controller";
import * as productsController from "./controllers/products.controller";
import * as subscriptionsController from "./controllers/subscriptions.controller";
import * as customerSubscriptionsController from "./controllers/customer-subscriptions.controller";
import * as paymentLinksController from "./controllers/payment-links.controller";
import * as pingController from "./controllers/ping.controller";
import morgan from "morgan";
import dotenv from "dotenv";
import {
  webhookListener,
  subscriptionWebhookListener,
  refundWebhookListener,
} from "./middleware/webhook-listener";
import {
  authenticateAPIKey,
  addEnvironmentToResponse,
} from "./middleware/auth";
import { trackApiUsage } from "./middleware/api-usage";
import { routeTestRequests } from "./middleware/environment-router";
import webhookReceiverRoutes from "./routes/webhook-receiver.routes";

// Import for the new internal endpoint
import { triggerMerchantWebhookForTransaction, logger as webhookSenderLogger } from "./services/webhook-sender";
import { WebhookEvent } from "./types/api";

// Types
interface ApiError extends Error {
  statusCode?: number;
  validationErrors?: z.ZodError;
}

// Request Validation Schemas
const checkoutSessionSchema = z.object({
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  provider_codes: z.array(z.nativeEnum(ProviderCode)),
  amount: z.number().positive(),
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
});

const transactionFilterSchema = z.object({
  status: z.nativeEnum(TransactionStatus).optional(),
  provider: z.nativeEnum(ProviderCode).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

// Initialize SDK
const sdk = new LomiSDK({
  baseUrl: process.env.API_BASE_URL || "https://api.lomi.africa/v1",
  apiKey: process.env.INTERNAL_API_KEY,
});

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route test environment requests appropriately
// This should be before authentication to catch test keys used on live API
app.use(routeTestRequests);

// Apply webhook listener middlewares to intercept responses
app.use(webhookListener);
app.use(subscriptionWebhookListener);
app.use(refundWebhookListener);

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [
  "https://lomi.africa",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// IP-based rate limiting (this is separate from API key-based rate limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Validation middleware
const validateRequest =
  (schema: z.ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const apiError: ApiError = new Error("Validation failed");
        apiError.statusCode = 400;
        apiError.validationErrors = error;
        next(apiError);
      } else {
        next(error);
      }
    }
  };

// Root route handler
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "lomi. API",
    version: "1.0.1",
    documentation: "https://developers.lomi.africa",
    endpoints: {
      health: "/health",
      api: "/v1",
    },
    status: "operational",
  });
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.1",
  });
});

// Ping endpoint for API health check
app.get("/v1/ping", pingController.pingApi);

// --- START: New Internal Webhook Trigger Endpoint (BEFORE authentication) ---
// This endpoint provides webhook triggering with two methods:
// 1. Primary: Uses trigger-webhook edge function (fast, reliable)
// 2. Fallback: Uses webhook-sender.ts service (legacy compatibility)
const INTERNAL_TRIGGER_SECRET = process.env.INTERNAL_WEBHOOK_TRIGGER_SECRET;

app.post("/v1/internal/trigger-webhook", (req: Request, res: Response) => {
  webhookSenderLogger.info("V2: Internal webhook trigger endpoint called", {
    headers: req.headers,
    body: req.body,
    hasSecret: !!INTERNAL_TRIGGER_SECRET,
  });

  // Authorization and validation
  if (!INTERNAL_TRIGGER_SECRET) {
    webhookSenderLogger.error("V2: INTERNAL_WEBHOOK_TRIGGER_SECRET is not set. Endpoint disabled.");
    return res.status(503).json({ error: "Service unavailable. Configuration error." });
  }
  const providedSecret = req.headers['x-internal-secret'] as string;
  if (providedSecret !== INTERNAL_TRIGGER_SECRET) {
    webhookSenderLogger.warn("V2: Unauthorized attempt to trigger internal webhook endpoint.");
    return res.status(403).json({ error: "Forbidden" });
  }

  const { transactionId, organizationId, event } = req.body;
  
  // Convert database format (payment.succeeded) to API format (PAYMENT_SUCCEEDED) for validation
  const normalizedEvent = event ? event.replace(/\./g, '_').toUpperCase() : event;
  
  if (!transactionId || !organizationId || !event || !Object.values(WebhookEvent).includes(normalizedEvent as WebhookEvent)) {
    webhookSenderLogger.warn("V2: Invalid payload for internal webhook trigger.", req.body);
    return res.status(400).json({ error: "Invalid payload: Missing or invalid transactionId, organizationId, or event." });
  }

  webhookSenderLogger.info("V2: Payload validated. Processing webhook trigger.", { transactionId, organizationId, event });

  // Execute the async operation but don't await it here.
  // Instead, handle the promise to send a response only after it completes.
  triggerMerchantWebhookForTransaction(
    transactionId,
    organizationId,
    normalizedEvent as WebhookEvent,
  )
  .then(() => {
    webhookSenderLogger.info("V2: triggerMerchantWebhookForTransaction completed successfully.", { transactionId });
    // This response indicates the entire process finished.
    // NOTE: This response might not be received by the original caller (e.g., the Wave webhook)
    // if it has a short timeout. The primary goal is to ensure the function runs to completion.
  })
  .catch((error: any) => {
    webhookSenderLogger.error("V2: triggerMerchantWebhookForTransaction failed.", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId,
    });
  });

  // Immediately send a 202 Accepted response to the caller.
  // This confirms the request was received and is being processed.
  res.status(202).json({ message: "V2: Webhook trigger request accepted and is being processed." });
});
// --- END: New Internal Webhook Trigger Endpoint ---

// API Routes
// API routes that require authentication
app.use("/v1", authenticateAPIKey);

// Add environment flag to responses
app.use("/v1", addEnvironmentToResponse);

// Add API usage tracking middleware
app.use("/v1", trackApiUsage);

// Register webhook receiver routes (no authentication middleware as they use signature verification)
app.use("/v1/webhook-receiver", webhookReceiverRoutes);

// Merchants
app.get("/v1/merchants/:id", merchantsController.getMerchant);
app.get("/v1/merchants/:id/mrr", merchantsController.getMerchantMrr);
app.get("/v1/merchants/:id/arr", merchantsController.getMerchantArr);
app.get("/v1/merchants/:id/balance", merchantsController.getMerchantBalance);

// Customers
app.post("/v1/customers", customersController.createCustomer);
app.get("/v1/customers", customersController.listCustomers);
app.get("/v1/customers/:id", customersController.getCustomer);
app.patch("/v1/customers/:id", customersController.updateCustomer);
app.delete("/v1/customers/:id", customersController.deleteCustomer);

// Checkout Sessions
app.post(
  "/v1/checkout-sessions",
  checkoutSessionsController.createCheckoutSession,
);
app.get(
  "/v1/checkout-sessions",
  checkoutSessionsController.listCheckoutSessions,
);
app.get(
  "/v1/checkout-sessions/:id",
  checkoutSessionsController.getCheckoutSession,
);

// Payment Links
app.post("/v1/payment-links", paymentLinksController.createPaymentLink);
app.get("/v1/payment-links", paymentLinksController.listPaymentLinks);
app.get("/v1/payment-links/:link_id", paymentLinksController.getPaymentLink);
app.patch(
  "/v1/payment-links/:link_id",
  paymentLinksController.updatePaymentLink,
);
app.delete(
  "/v1/payment-links/:link_id",
  paymentLinksController.deletePaymentLink,
);

// Transactions
app.get("/v1/transactions", transactionsController.listTransactions);
app.get(
  "/v1/transactions/:transaction_id",
  transactionsController.getTransactionById,
);

// Refunds — TBI later
// app.post("/v1/refunds", refundsController.createRefund); // Commented out - Handled via UI/PSP interaction for now
// app.get("/v1/refunds/:id", refundsController.getRefund);
// app.patch("/v1/refunds/:id", refundsController.updateRefundStatus); // Commented out - Handled via UI/PSP interaction for now

// Providers
app.get("/v1/providers", providersController.listProviders);

// Products
app.post("/v1/products", productsController.createProduct);
app.get("/v1/products", productsController.listProducts);
app.get("/v1/products/:product_id", productsController.getProduct);
app.patch("/v1/products/:product_id", productsController.updateProduct);
app.delete("/v1/products/:product_id", productsController.deleteProduct);

// Subscription Plans (under Merchant context)
app.post(
  "/v1/merchants/:merchant_id/subscriptions",
  subscriptionsController.createSubscriptionPlan,
);
app.get(
  "/v1/merchants/:merchant_id/subscriptions",
  subscriptionsController.listSubscriptionPlans,
);
app.get(
  "/v1/merchants/:merchant_id/subscriptions/:plan_id",
  subscriptionsController.getSubscriptionPlan,
);
app.patch(
  "/v1/merchants/:merchant_id/subscriptions/:plan_id",
  subscriptionsController.updateSubscriptionPlan,
);
app.delete(
  "/v1/merchants/:merchant_id/subscriptions/:plan_id",
  subscriptionsController.deleteSubscriptionPlan,
);

// Customer Subscriptions (using merchant_id from query params)
app.get(
  "/v1/customer-subscriptions",
  customerSubscriptionsController.listCustomerSubscriptions,
);
app.get(
  "/v1/customer-subscriptions/:subscription_id",
  customerSubscriptionsController.getSubscription,
);
app.patch(
  "/v1/customer-subscriptions/:subscription_id",
  customerSubscriptionsController.updateSubscription,
);
app.delete(
  "/v1/customer-subscriptions/:subscription_id",
  customerSubscriptionsController.cancelSubscription,
);

// Webhooks
app.get("/v1/webhooks", webhookController.listWebhooks);
app.post("/v1/webhooks", webhookController.createWebhook);
app.get("/v1/webhooks/:id", webhookController.getWebhook);
app.patch("/v1/webhooks/:id", webhookController.updateWebhook);
app.delete("/v1/webhooks/:id", webhookController.deleteWebhook);
app.post("/v1/webhooks/:id/test", webhookController.testWebhook);
app.get("/v1/webhooks/:id/logs", webhookController.getWebhookDeliveryLogs);
app.post(
  "/v1/webhooks/:id/logs/:logId/retry",
  webhookController.retryWebhookDelivery,
);

// Error handling middleware
app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  console.error(`Error processing request: ${err.message}`);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: err.message,
      validation: err.validationErrors
        ? err.validationErrors.format()
        : undefined,
    },
  });
});

export default app;
