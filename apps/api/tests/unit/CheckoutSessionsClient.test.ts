import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { CheckoutSessionsClient } from '../../src/client/CheckoutSessionsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('CheckoutSessionsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: CheckoutSessionsClient;

  beforeEach(() => {
    client = new CheckoutSessionsClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('checkoutSession', () => {
    const mockCreateData: Types.CreateCheckoutSession = {
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Test Checkout Session',
      public_description: 'This is a test checkout session',
      amount: 1000,
      currency_code: Types.CurrencyCode.XOF,
      success_url: 'https://success.test.com',
      cancel_url: 'https://cancel.test.com',
      allowed_providers: [Types.ProviderCode.ORANGE, Types.ProviderCode.WAVE],
      customer_email: 'test@example.com',
      customer_name: 'Test Customer'
    };

    const mockResponse: Types.CheckoutSession = {
      ...mockCreateData,
      checkout_session_id: '123e4567-e89b-12d3-a456-426614174001',
      url: 'https://checkout.test.com/session',
      status: Types.CheckoutSessionStatus.open,
      created_at: new Date('2024-01-17T00:00:00Z'),
      expires_at: new Date('2024-01-17T01:00:00Z')
    };

    it('should create a checkout session successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await client.createCheckoutSession(mockCreateData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/checkout-sessions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockCreateData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('checkoutSessions', () => {
    const mockSessionId = '123e4567-e89b-12d3-a456-426614174001';
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockSession: Types.CheckoutSession = {
      merchant_id: mockMerchantId,
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Test Checkout Session',
      public_description: 'This is a test checkout session',
      amount: 1000,
      currency_code: Types.CurrencyCode.XOF,
      success_url: 'https://success.test.com',
      cancel_url: 'https://cancel.test.com',
      allowed_providers: [Types.ProviderCode.ORANGE, Types.ProviderCode.WAVE],
      checkout_session_id: mockSessionId,
      url: 'https://checkout.test.com/session',
      status: Types.CheckoutSessionStatus.open,
      created_at: new Date('2024-01-17T00:00:00Z'),
      expires_at: new Date('2024-01-17T01:00:00Z')
    };

    it('should list checkout sessions successfully with merchant_id and session_id filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSession])
      } as Response);

      const result = await client.listCheckoutSessions(mockMerchantId, {
        checkout_session_id: mockSessionId
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/checkout-sessions?merchant_id=${mockMerchantId}&checkout_session_id=${mockSessionId}`,
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
      expect(result.data).toEqual([mockSession]);
    });

    it('should list checkout sessions successfully with optional params', async () => {
      const optionalParams = { checkout_session_id: mockSessionId }; // Status could also be tested here
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSession])
      } as Response);
      // Pass merchant_id first, then optional params object
      const result = await client.listCheckoutSessions(mockMerchantId, optionalParams);
      expect(result.data).toEqual([mockSession]);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/checkout-sessions?merchant_id=${mockMerchantId}&checkout_session_id=${mockSessionId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );
    });
  });

  describe('getCheckoutSession', () => {
    const mockSessionId = '123e4567-e89b-12d3-a456-426614174001';
    const mockSession: Types.CheckoutSession = {
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Test Checkout Session',
      public_description: 'This is a test checkout session',
      amount: 1000,
      currency_code: Types.CurrencyCode.XOF,
      success_url: 'https://success.test.com',
      cancel_url: 'https://cancel.test.com',
      allowed_providers: [Types.ProviderCode.ORANGE, Types.ProviderCode.WAVE],
      checkout_session_id: mockSessionId,
      url: 'https://checkout.test.com/session',
      status: Types.CheckoutSessionStatus.open,
      created_at: new Date('2024-01-17T00:00:00Z'),
      expires_at: new Date('2024-01-17T01:00:00Z')
    };

    it('should get a checkout session by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSession)
      } as Response);

      const result = await client.getCheckoutSession(mockSessionId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/checkout-sessions/${mockSessionId}`,
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
      expect(result.data).toEqual(mockSession);
      expect(result.data.checkout_session_id).toBe(mockSessionId);
    });
  });
}); 