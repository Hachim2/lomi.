import express from "express";
import * as webhookController from "../controllers/webhook.controller";
import { authenticateJWT } from "../middleware/auth";

const router = express.Router();

/**
 * @route   GET /api/v1/webhooks
 * @desc    List all webhooks for the authenticated organization
 * @access  Private
 */
router.get("/", authenticateJWT, webhookController.listWebhooks);

/**
 * @route   POST /api/v1/webhooks
 * @desc    Create a new webhook
 * @access  Private
 */
router.post("/", authenticateJWT, webhookController.createWebhook);

/**
 * @route   GET /api/v1/webhooks/:id
 * @desc    Get a webhook by ID
 * @access  Private
 */
router.get("/:id", authenticateJWT, webhookController.getWebhook);

/**
 * @route   PATCH /api/v1/webhooks/:id
 * @desc    Update a webhook
 * @access  Private
 */
router.patch("/:id", authenticateJWT, webhookController.updateWebhook);

/**
 * @route   DELETE /api/v1/webhooks/:id
 * @desc    Delete a webhook
 * @access  Private
 */
router.delete("/:id", authenticateJWT, webhookController.deleteWebhook);

export default router;
