import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { WebhooksClient } from '../../src/client/WebhooksClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('WebhooksClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: WebhooksClient;

  beforeEach(() => {
    client = new WebhooksClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('createWebhook', () => {
    const mockCreateWebhookData: Types.CreateWebhook = {
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174001',
      url: 'https://webhook.test.com/endpoint',
      authorized_events: [
        Types.WebhookEvent.PAYMENT_SUCCEEDED,
        Types.WebhookEvent.REFUND_COMPLETED
      ],
      is_active: true,
      metadata: { test: 'data' }
    };

    const mockWebhookResponse: Types.Webhook = {
      ...mockCreateWebhookData,
      webhook_id: '123e4567-e89b-12d3-a456-426614174001',
      verification_token: 'abc123def456',
      last_triggered_at: new Date('2024-01-17T00:00:00Z'),
      last_payload: { event: 'test' },
      last_response_status: 200,
      last_response_body: '{"status":"ok"}',
      retry_count: 0,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should create a webhook endpoint successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockWebhookResponse)
      } as Response);

      const result = await client.createWebhook(mockCreateWebhookData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/webhooks',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockCreateWebhookData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockWebhookResponse);
    });
  });

  describe('listWebhooks', () => {
    const mockMerchantId = 'merchant_789';
    const mockWebhookList = [{ id: 'hook_1', url: 'https://example.com/hook' }];

    it('should list webhooks successfully with only merchant_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockWebhookList)
      } as Response);

      const result = await client.listWebhooks(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks?merchant_id=${mockMerchantId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockWebhookList);
    });

    it('should list webhooks successfully with optional params', async () => {
      const optionalParams = { organization_id: 'org_abc', is_active: 'true' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockWebhookList)
      } as Response);

      const result = await client.listWebhooks(mockMerchantId, optionalParams);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks?merchant_id=${mockMerchantId}&organization_id=org_abc&is_active=true`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockWebhookList);
    });
  });

  describe('getWebhook', () => {
    const mockWebhookId = '123e4567-e89b-12d3-a456-426614174001';
    const mockWebhook: Types.Webhook = {
      webhook_id: mockWebhookId,
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      url: 'https://webhook.test.com/endpoint',
      authorized_events: [Types.WebhookEvent.PAYMENT_SUCCEEDED],
      is_active: true,
      verification_token: 'abc123def456',
      last_triggered_at: new Date('2024-01-17T00:00:00Z'),
      last_payload: { event: 'test' },
      last_response_status: 200,
      last_response_body: '{"status":"ok"}',
      retry_count: 0,
      metadata: { test: 'data' },
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should get a webhook endpoint successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockWebhook)
      } as Response);

      const result = await client.getWebhook(mockWebhookId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks/${mockWebhookId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockWebhook);
    });
  });

  describe('updateWebhook', () => {
    const mockWebhookId = '123e4567-e89b-12d3-a456-426614174001';
    const mockUpdateData = {
      url: 'https://webhook.test.com/updated-endpoint',
      authorized_events: [
        Types.WebhookEvent.PAYMENT_SUCCEEDED,
        Types.WebhookEvent.REFUND_COMPLETED,
        Types.WebhookEvent.SUBSCRIPTION_RENEWED
      ],
      is_active: false,
      metadata: { test: 'updated' }
    };

    const mockUpdatedWebhook: Types.Webhook = {
      webhook_id: mockWebhookId,
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      ...mockUpdateData,
      verification_token: 'abc123def456',
      last_triggered_at: new Date('2024-01-17T00:00:00Z'),
      last_payload: { event: 'test' },
      last_response_status: 200,
      last_response_body: '{"status":"ok"}',
      retry_count: 0,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should update a webhook endpoint successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUpdatedWebhook)
      } as Response);

      const result = await client.updateWebhook(mockWebhookId, mockUpdateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks/${mockWebhookId}`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockUpdateData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockUpdatedWebhook);
    });
  });

  describe('deleteWebhook', () => {
    const mockWebhookId = '123e4567-e89b-12d3-a456-426614174001';

    it('should delete a webhook endpoint successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined)
      } as Response);

      const result = await client.deleteWebhook(mockWebhookId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks/${mockWebhookId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    });
  });

  describe('regenerateWebhookSecret', () => {
    const mockWebhookId = '123e4567-e89b-12d3-a456-426614174001';
    const mockResponse = {
      webhook_id: mockWebhookId,
      secret: 'whsec_new_secret_token_123456789abcdef',
    };

    it('should regenerate a webhook secret successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await client.regenerateWebhookSecret(mockWebhookId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks/${mockWebhookId}/regenerate-secret`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('testWebhook', () => {
    const mockWebhookId = '123e4567-e89b-12d3-a456-426614174001';
    const mockResponse = {
      success: true,
      message: 'Test webhook sent successfully'
    };

    it('should test a webhook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await client.testWebhook(mockWebhookId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/webhooks/${mockWebhookId}/test`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse);
    });
  });
}); 