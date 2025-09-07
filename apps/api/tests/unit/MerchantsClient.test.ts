import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MerchantsClient } from '../../src/client/MerchantsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('MerchantsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: MerchantsClient;

  beforeEach(() => {
    client = new MerchantsClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('get', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockMerchant: Types.Merchant = {
      merchant_id: mockMerchantId,
      name: 'Test Merchant',
      email: 'merchant@test.com',
      phone_number: '+1234567890',
      onboarded: true,
      country: 'US',
      avatar_url: 'https://test.com/avatar.png',
      preferred_language: 'en',
      timezone: 'UTC',
      metadata: { test: 'data' },
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should get merchant details successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMerchant)
      } as Response);

      const result = await client.get(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}`,
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
      expect(result.data).toEqual(mockMerchant);
    });
  });

  describe('merchantProviders', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockConnectedProviders: Types.ConnectedProvider[] = [
      {
        provider_code: Types.ProviderCode.ORANGE,
        is_connected: true,
        phone_number: '+1234567890',
        is_phone_verified: true,
        metadata: { test: 'data1' },
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      },
      {
        provider_code: Types.ProviderCode.WAVE,
        is_connected: true,
        phone_number: '+0987654321',
        is_phone_verified: true,
        metadata: { test: 'data2' },
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      }
    ];

    it('should list connected providers successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConnectedProviders)
      } as Response);

      const result = await client.merchantProviders(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/providers`,
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
      expect(result.data).toEqual(mockConnectedProviders);
    });
  });

  // Add tests for getMerchantMrr
  describe('getMerchantMrr', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockMrrData = { 
      amount: 5000, 
      currency_code: 'USD' 
    };

    it('should get merchant MRR successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMrrData)
      } as Response);

      const result = await client.getMerchantMrr(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/mrr`,
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
      expect(result.data).toEqual(mockMrrData);
    });
  });

  // Add tests for getMerchantArr
  describe('getMerchantArr', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockArrData = { 
      amount: 60000, 
      currency_code: 'USD' 
    };

    it('should get merchant ARR successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockArrData)
      } as Response);

      const result = await client.getMerchantArr(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/arr`,
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
      expect(result.data).toEqual(mockArrData);
    });
  });

  // Add tests for getMerchantBalance
  describe('getMerchantBalance', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockBalanceData = [
      { 
        currency_code: 'USD',
        balance: 10000
      },
      {
        currency_code: 'EUR',
        balance: 5000
      }
    ];

    it('should get merchant balance successfully without parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBalanceData)
      } as Response);

      const result = await client.getMerchantBalance(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/balance`,
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
      expect(result.data).toEqual(mockBalanceData);
    });

    it('should get merchant balance successfully with currency parameter', async () => {
      const filteredBalanceData = [
        { 
          currency_code: 'USD',
          balance: 10000
        }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(filteredBalanceData)
      } as Response);

      const result = await client.getMerchantBalance(mockMerchantId, { currency_code: 'USD' });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/balance?currency_code=USD`,
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
      expect(result.data).toEqual(filteredBalanceData);
    });
  });

  // Add tests for listMerchantAccounts
  describe('listMerchantAccounts', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockAccountsData: Types.MerchantAccount[] = [
      {
        account_id: 'acc_123',
        merchant_id: mockMerchantId,
        organization_id: 'org_123',
        balance: 10000,
        currency_code: Types.CurrencyCode.USD,
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      },
      {
        account_id: 'acc_456',
        merchant_id: mockMerchantId,
        organization_id: 'org_123',
        balance: 5000,
        currency_code: Types.CurrencyCode.EUR,
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      }
    ];

    it('should list merchant accounts successfully without parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAccountsData)
      } as Response);

      const result = await client.listMerchantAccounts(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/accounts`,
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
      expect(result.data).toEqual(mockAccountsData);
    });

    it('should list merchant accounts successfully with currency parameter', async () => {
      const filteredAccountsData = [mockAccountsData[0]]; // Just the USD account
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(filteredAccountsData)
      } as Response);

      const result = await client.listMerchantAccounts(mockMerchantId, { currency_code: 'USD' });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/accounts?currency_code=USD`,
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
      expect(result.data).toEqual(filteredAccountsData);
    });
  });

  // Add tests for getMerchantTransactionsSummary
  describe('getMerchantTransactionsSummary', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockSummaryData = {
      total_count: 150,
      total_amount: 45000,
      by_status: {
        completed: { count: 120, amount: 40000 },
        pending: { count: 20, amount: 5000 },
        failed: { count: 10, amount: 0 }
      }
    };

    it('should get merchant transactions summary successfully without parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSummaryData)
      } as Response);

      const result = await client.getMerchantTransactionsSummary(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/transactions/summary`,
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
      expect(result.data).toEqual(mockSummaryData);
    });

    it('should get merchant transactions summary successfully with all parameters', async () => {
      const filteredSummaryData = {
        total_count: 50,
        total_amount: 15000,
        by_status: {
          completed: { count: 40, amount: 12000 },
          pending: { count: 8, amount: 3000 },
          failed: { count: 2, amount: 0 }
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(filteredSummaryData)
      } as Response);

      const params = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        currency_code: 'USD'
      };
      
      const result = await client.getMerchantTransactionsSummary(mockMerchantId, params);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/merchants/${mockMerchantId}/transactions/summary?start_date=2023-01-01&end_date=2023-12-31&currency_code=USD`,
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
      expect(result.data).toEqual(filteredSummaryData);
    });
  });

  // Tests for Subscription Plan methods
  describe('Subscription Plans', () => {
    const mockMerchantId = 'merch_123';
    const mockPlanId = 'plan_abc';
    const mockSubscriptionPlan: Types.SubscriptionPlan = {
      plan_id: mockPlanId,
      merchant_id: mockMerchantId,
      organization_id: 'org_xyz',
      name: 'Test Plan',
      description: 'A test subscription plan',
      billing_frequency: Types.BillingFrequency.monthly,
      amount: 1000,
      currency_code: Types.CurrencyCode.USD,
      is_active: true,
      metadata: { key: 'value' },
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
    };
    const mockCreateData: Types.CreateSubscriptionPlan = {
      name: 'New Test Plan',
      billing_frequency: Types.BillingFrequency.yearly,
      amount: 12000,
      currency_code: Types.CurrencyCode.USD,
    };

    describe('create (Subscription Plan)', () => {
      it('should create a subscription plan successfully', async () => {
        const mockResponsePlan = { ...mockSubscriptionPlan, name: mockCreateData.name, billing_frequency: mockCreateData.billing_frequency, amount: mockCreateData.amount };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve(mockResponsePlan)
        } as Response);

        const result = await client.create(mockMerchantId, mockCreateData);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions`,
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(mockCreateData),
          })
        );
        expect(result.status).toBe(201);
        expect(result.data).toEqual(mockResponsePlan);
      });
    });

    describe('list (Subscription Plans)', () => {
      it('should list subscription plans successfully', async () => {
         mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([mockSubscriptionPlan])
        } as Response);

        const result = await client.list(mockMerchantId);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions`,
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.status).toBe(200);
        expect(result.data).toEqual([mockSubscriptionPlan]);
      });

       it('should list subscription plans with pagination successfully', async () => {
         mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]) // Expect empty array for second page
        } as Response);

        const params = { limit: '10', offset: '10' };
        const result = await client.list(mockMerchantId, params);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions?limit=10&offset=10`,
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.status).toBe(200);
        expect(result.data).toEqual([]);
      });
    });

    describe('getSubscriptionPlan', () => {
      it('should get a specific subscription plan successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSubscriptionPlan)
        } as Response);

        const result = await client.getSubscriptionPlan(mockMerchantId, mockPlanId);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions/${mockPlanId}`,
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.status).toBe(200);
        expect(result.data).toEqual(mockSubscriptionPlan);
      });
    });

    describe('updateSubscriptionPlan', () => {
       it('should update a subscription plan successfully', async () => {
        const updateData = { is_active: false, metadata: { updated: true } };
        const updatedPlan = { ...mockSubscriptionPlan, ...updateData, updated_at: new Date() };
         mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(updatedPlan)
        } as Response);

        const result = await client.updateSubscriptionPlan(mockMerchantId, mockPlanId, updateData);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions/${mockPlanId}`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(updateData),
          })
        );
        expect(result.status).toBe(200);
        expect(result.data).toEqual(updatedPlan);
      });
    });

    describe('deleteSubscriptionPlan', () => {
      it('should delete a subscription plan successfully', async () => {
         mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204, // No Content
          json: () => Promise.resolve(undefined)
        } as Response);

        const result = await client.deleteSubscriptionPlan(mockMerchantId, mockPlanId);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.test.com/merchants/${mockMerchantId}/subscriptions/${mockPlanId}`,
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(result.status).toBe(204);
        expect(result.data).toBeUndefined();
      });
    });
  }); // End of Subscription Plans describe block
}); 