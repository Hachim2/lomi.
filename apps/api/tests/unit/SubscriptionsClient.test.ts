import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SubscriptionsClient } from '../../src/client/SubscriptionsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('SubscriptionsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: SubscriptionsClient;

  beforeEach(() => {
    client = new SubscriptionsClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('create', () => {
    const mockCreateSubscriptionPlanData: Types.CreateSubscriptionPlan = {
      name: 'Test Plan',
      description: 'A test subscription plan',
      amount: 1000,
      currency_code: Types.CurrencyCode.USD,
      billing_frequency: Types.BillingFrequency.monthly,
      failed_payment_action: Types.FailedPaymentAction.continue,
      charge_day: 1,
      metadata: { test: 'data' },
      display_on_storefront: true,
      image_url: 'https://example.com/image.jpg',
      first_payment_type: Types.FirstPaymentType.initial
    };

    const mockSubscriptionPlanResponse: Types.SubscriptionPlan = {
      ...mockCreateSubscriptionPlanData,
      plan_id: '123e4567-e89b-12d3-a456-426614174000',
      merchant_id: '123e4567-e89b-12d3-a456-426614174001',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should create a subscription plan successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockSubscriptionPlanResponse)
      } as Response);

      const result = await client.create(mockCreateSubscriptionPlanData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/subscriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockCreateSubscriptionPlanData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockSubscriptionPlanResponse);
    });
  });

  describe('list', () => {
    const mockMerchantId = 'merchant_123';
    const mockPlanList = [{ id: 'plan_1', name: 'Basic' }];

    it('should list subscription plans successfully with only merchant_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPlanList)
      } as Response);

      const result = await client.list(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/subscriptions?merchant_id=${mockMerchantId}`,
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
      expect(result.data).toEqual(mockPlanList);
    });

    it('should list subscription plans successfully with optional params', async () => {
      const optionalParams = { limit: '10', offset: '5' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPlanList)
      } as Response);

      const result = await client.list(mockMerchantId, optionalParams);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/subscriptions?merchant_id=${mockMerchantId}&limit=${optionalParams.limit}&offset=${optionalParams.offset}`,
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
      expect(result.data).toEqual(mockPlanList);
    });
  });

  // ---- REMOVING TESTS FOR NON-EXISTENT METHODS ----
});

// Helper function (if needed)
// function createMockApiResult<T>(status: number, data?: T): ApiResult<T> {
//   return new ApiResult(status, data);
// }
