import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class WebhooksClient extends BaseClient {
/**
 * Register a new webhook endpoint
 * Create a new webhook endpoint for receiving event notifications
 */  public async createWebhook(data: Types.CreateWebhook): Promise<ApiResult<Types.Webhook>> {
    return this.request({
      method: 'POST',
      path: '/webhooks',
      data
    });
  }

/**
 * List webhook endpoints
 * List all webhook endpoints for a merchant
 */  public async listWebhooks(merchant_id: string, optionalParams?: { organization_id?: string, is_active?: string }): Promise<ApiResult<Types.Webhook[]>> {
    return this.request({
      method: 'GET',
      path: '/webhooks',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get webhook details
 * Get details of a specific webhook endpoint
 */  public async getWebhook(webhook_id: string): Promise<ApiResult<Types.Webhook>> {
    return this.request({
      method: 'GET',
      path: '/webhooks/{webhook_id}',
      params: { webhook_id: webhook_id }
    });
  }

/**
 * Update webhook configuration
 * Update webhook endpoint configuration
 */  public async updateWebhook(webhook_id: string, data: Record<string, unknown>): Promise<ApiResult<Types.Webhook>> {
    return this.request({
      method: 'PATCH',
      path: '/webhooks/{webhook_id}',
      params: { webhook_id: webhook_id },
      data
    });
  }

/**
 * Delete webhook endpoint
 * Delete a webhook endpoint
 */  public async deleteWebhook(webhook_id: string): Promise<ApiResult<void>> {
    return this.request({
      method: 'DELETE',
      path: '/webhooks/{webhook_id}',
      params: { webhook_id: webhook_id }
    });
  }

/**
 * Regenerate webhook secret
 * Generate a new verification token for a webhook endpoint
 */  public async regenerateWebhookSecret(webhook_id: string): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'POST',
      path: '/webhooks/{webhook_id}/regenerate-secret',
      params: { webhook_id: webhook_id }
    });
  }

/**
 * Send test webhook
 * Send a test event to a webhook endpoint to verify it's working correctly
 */  public async testWebhook(webhook_id: string): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'POST',
      path: '/webhooks/{webhook_id}/test',
      params: { webhook_id: webhook_id }
    });
  }
}