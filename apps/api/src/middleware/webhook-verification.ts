import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Middleware to verify incoming webhook requests from merchants
 *
 * This checks that the incoming request has a valid signature that matches
 * what we would generate using the stored webhook secret for that merchant.
 *
 * Expected headers:
 * - X-Merchant-Signature: The signature from the merchant
 * - X-Webhook-ID: The ID of the webhook configuration
 * - Content-Type: application/json
 */
export const verifyWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the signature and webhook ID from headers
    const signature = req.headers["x-merchant-signature"] as string;
    const webhookId = req.headers["x-webhook-id"] as string;

    // Validate required headers
    if (!signature) {
      return res.status(401).json({
        error: {
          message: "Missing X-Merchant-Signature header",
        },
      });
    }

    if (!webhookId) {
      return res.status(401).json({
        error: {
          message: "Missing X-Webhook-ID header",
        },
      });
    }

    // Fetch the webhook configuration from the database
    const { data: webhook, error } = await supabase.rpc("get_webhook_by_id", {
      p_webhook_id: webhookId,
    });

    if (error || !webhook || webhook.length === 0) {
      return res.status(401).json({
        error: {
          message: "Invalid webhook configuration",
        },
      });
    }

    // Get the verification token (secret)
    const verificationToken = webhook[0].verification_token;

    if (!verificationToken) {
      return res.status(500).json({
        error: {
          message: "Webhook configuration error: missing verification token",
        },
      });
    }

    // Convert raw body to string if it exists
    const rawBody = req.body ? JSON.stringify(req.body) : "";

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", verificationToken)
      .update(rawBody)
      .digest("hex");

    // Compare signatures (constant-time comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      return res.status(401).json({
        error: {
          message: "Invalid webhook signature",
        },
      });
    }

    // Add webhook information to request
    req.webhookId = webhookId;
    req.merchantId = webhook[0].merchant_id;
    req.organizationId = webhook[0].organization_id;

    // Continue processing the request
    next();
  } catch (error: any) {
    console.error("Webhook verification error:", error);
    return res.status(500).json({
      error: {
        message: "Failed to verify webhook signature",
        details: error.message,
      },
    });
  }
};

// Extend Request interface to include webhook information
declare global {
  namespace Express {
    interface Request {
      webhookId?: string;
    }
  }
}
