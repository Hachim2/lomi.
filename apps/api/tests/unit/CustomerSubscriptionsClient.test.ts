import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { CustomerSubscriptionsClient } from '../../src/client/CustomerSubscriptionsClient';
import { BaseClient } from '../../src/client/BaseClient';
import { ApiResult } from '../../src/client/core/ApiResult';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('CustomerSubscriptionsClient', () => {
  const baseUrl = 'https://api.example.com';
  const apiKey = 'test_api_key';
  let client: CustomerSubscriptionsClient;
  let mockRequest: any; // Use any type for the spy

  beforeEach(() => {
    mockFetch.mockReset();
    client = new CustomerSubscriptionsClient(baseUrl, apiKey);
    mockRequest = jest.spyOn(BaseClient.prototype as any, 'request');
  });

  afterEach(() => {
    mockRequest.mockRestore();
  });

  describe('listCustomerSubscriptions', () => {
    const mockMerchantId = 'merchant_custsub_1';
    const mockSubscriptionList = [{ id: 'sub_1', status: 'active' }];

    it('should list subscriptions successfully with only merchant_id', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockSubscriptionList));
      const result = await client.listCustomerSubscriptions(mockMerchantId); // Pass merchant_id directly
      expect(result.data).toEqual(mockSubscriptionList);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customer-subscriptions',
        params: { merchant_id: mockMerchantId }, // Expect params object
      });
    });

    it('should list subscriptions successfully with optional params', async () => {
      const optionalParams = { customer_id: 'cust_abc', status: 'active' };
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockSubscriptionList));
      const result = await client.listCustomerSubscriptions(mockMerchantId, optionalParams); // Pass optionalParams as second arg
      expect(result.data).toEqual(mockSubscriptionList);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customer-subscriptions',
        params: { merchant_id: mockMerchantId, ...optionalParams }, // Expect merged params
      });
    });

    // ... add tests for error handling ...
  });

  describe('getSubscription', () => {
    const mockSubscriptionId = 'sub_xyz';
    const mockMerchantId = 'merchant_custsub_2'; // Added merchant_id
    const mockSubscriptionData = { id: mockSubscriptionId, status: 'trialing' };

    it('should get a subscription successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockSubscriptionData));
      const result = await client.getSubscription(mockSubscriptionId, mockMerchantId); // Pass both IDs
      expect(result.data).toEqual(mockSubscriptionData);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customer-subscriptions/{subscription_id}', // Use path template
        params: { subscription_id: mockSubscriptionId, merchant_id: mockMerchantId }, // Expect both params
      });
    });

    // ... add tests for error handling ...
  });

  describe('updateSubscription', () => {
    const mockSubscriptionId = 'sub_abc';
    const mockMerchantId = 'merchant_custsub_3'; // Added merchant_id
    const mockUpdateData = { status: 'canceled' }; // Example: updating status
    const mockUpdatedSubscription = { id: mockSubscriptionId, ...mockUpdateData };

    it('should update a subscription successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockUpdatedSubscription));
      const result = await client.updateSubscription(mockSubscriptionId, mockMerchantId, mockUpdateData); // Pass all three args
      expect(result.data).toEqual(mockUpdatedSubscription);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/customer-subscriptions/{subscription_id}', // Use path template
        params: { subscription_id: mockSubscriptionId, merchant_id: mockMerchantId }, // Expect both params
        data: mockUpdateData,
      });
    });

    // ... add tests for error handling ...
  });

  describe('cancelSubscription', () => {
    const mockSubscriptionId = 'sub_def';
    const mockMerchantId = 'merchant_custsub_4'; // Added merchant_id

    it('should cancel a subscription successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(204, undefined)); // Expect 204 No Content
      const result = await client.cancelSubscription(mockSubscriptionId, mockMerchantId); // Pass both IDs
      expect(result.status).toBe(204);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/customer-subscriptions/{subscription_id}', // Use path template
        params: { subscription_id: mockSubscriptionId, merchant_id: mockMerchantId }, // Expect both params
      });
    });

    // ... add tests for error handling ...
  });
}); 