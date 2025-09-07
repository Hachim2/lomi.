import express from "express";
import { verifyWebhookSignature } from "../middleware/webhook-verification";
import { triggerMerchantWebhookForTransaction } from "../services/webhook-sender";
import { WebhookEvent, Transaction, TransactionStatus } from "../types/api";

const router = express.Router();

/**
 * Maps a transaction status to the API webhook event (simplified version)
 */
const mapLocalStatusToWebhookEvent = (status: TransactionStatus): WebhookEvent | null => {
  switch (status) {
    case TransactionStatus.pending:
      return WebhookEvent.PAYMENT_CREATED;
    case TransactionStatus.completed:
      return WebhookEvent.PAYMENT_SUCCEEDED;
    case TransactionStatus.failed:
      return WebhookEvent.PAYMENT_FAILED;
    // Add other mappings as needed, e.g., for refunds or checkout completion
    default:
      console.warn(`No direct webhook event mapping for transaction status: ${status}`);
      return null; 
  }
};

/**
 * @route   POST /api/v1/webhook-receiver
 * @desc    Receive webhooks from merchants (actually PSPs for the platform)
 * @access  Public, but signature-protected
 */
router.post("/", verifyWebhookSignature, async (req, res) => {
  try {
    const { event: pspEvent, data: pspData } = req.body;

    if (!pspEvent || !pspData) {
      return res.status(400).json({
        error: {
          message: "Invalid webhook payload - missing event or data",
        },
      });
    }

    console.log(
      `Processing PSP webhook event ${pspEvent} for organization ${req.organizationId} (via merchant ${req.merchantId})`,
    );

    let updatedTransaction: Partial<Transaction> & { id: string; organization_id: string; status: TransactionStatus } | null = null;

    // Process different event types
    // This is where you'd interact with your DB, likely calling RPCs to update transaction status
    // For demonstration, we'll simulate an update and create a placeholder transaction object
    switch (pspEvent) {
      case "payment.succeeded": // Example PSP event name
        // 1. Call your internal service/RPC to update the transaction in your DB
        // const { data: dbResult, error: dbError } = await supabase.rpc('update_transaction_on_psp_success', { psp_data: pspData });
        // if (dbError) throw dbError;
        // updatedTransaction = dbResult as (Partial<Transaction> & { id: string; organization_id: string; status: TransactionStatus });
        
        // Placeholder for successful payment processing:
        updatedTransaction = {
          id: pspData.transaction_id || pspData.id || `sim_${Date.now()}`,
          organization_id: req.organizationId as string, // From verifyWebhookSignature middleware
          status: TransactionStatus.completed,
          // ... other relevant fields you might get back from your DB update
        };
        console.log(`Simulated update for payment.succeeded. Transaction ID: ${updatedTransaction.id}`);
        break;
      case "payment.failed": // Example PSP event name
        // updatedTransaction = await handlePspPaymentFailed(pspData, req.organizationId);
        // Placeholder:
        updatedTransaction = {
          id: pspData.transaction_id || pspData.id || `sim_${Date.now()}`,
          organization_id: req.organizationId as string,
          status: TransactionStatus.failed,
        };
        console.log(`Simulated update for payment.failed. Transaction ID: ${updatedTransaction.id}`);
        break;
      // Add other PSP event cases like "subscription.created", "refund.completed" etc.
      default:
        console.warn(`Unhandled PSP webhook event type: ${pspEvent}`);
    }

    // Log the webhook receipt
    console.log(`PSP Webhook ${req.webhookId} (from merchant config) received and processed successfully`);

    // Respond to the PSP webhook *before* trying to send our own merchant webhooks
    res.status(200).json({
      received: true,
      timestamp: new Date().toISOString(),
    });

    // AFTER responding to the PSP, if a transaction was updated, trigger our own merchant webhook
    if (updatedTransaction && updatedTransaction.id && updatedTransaction.organization_id && updatedTransaction.status) {
      const merchantWebhookEvent = mapLocalStatusToWebhookEvent(updatedTransaction.status);
      if (merchantWebhookEvent) {
        console.log(
          `Transaction ${updatedTransaction.id} updated. Triggering merchant webhook: ${merchantWebhookEvent}`
        );
        // Intentionally not awaiting this, to ensure the PSP response is fast.
        // Error handling within triggerMerchantWebhookForTransaction will use its logger.
        triggerMerchantWebhookForTransaction(
          updatedTransaction.id,
          updatedTransaction.organization_id,
          merchantWebhookEvent
        ).catch(e => {
            // Log here if you want to catch errors from the async call immediately in this context
            console.error('Error dispatching merchant webhook from webhook-receiver:', e);
        });
      } else {
        console.log(`No specific merchant webhook event mapped for transaction status: ${updatedTransaction.status}`);
      }
    }

  } catch (error: any) {
    console.error("Error processing PSP webhook:", error);
    // Check if response has already been sent
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: "Failed to process PSP webhook",
          details: error.message,
        },
      });
    }
  }
});

export default router;
