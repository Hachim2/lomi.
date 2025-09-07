import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { TransactionsClient } from '../../src/client/TransactionsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import { BaseClient } from '../../src/client/BaseClient';
import { ApiError } from '../../src/client/core/ApiError';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('TransactionsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: TransactionsClient;
  let mockRequest: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockClear();
    client = new TransactionsClient('https://api.test.com', 'test_api_key');
    // Mock the internal request method
    mockRequest = jest.spyOn(BaseClient.prototype as any, 'request');
  });

  afterEach(() => {
    mockRequest.mockRestore(); // Restore original method
  });

  describe('transactionsList', () => {
    const mockMerchantId = 'merchant_456';
    const mockTransactionList = [{ id: 'txn_1', amount: 100 }];

    it('should list transactions successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockTransactionList));
      const result = await client.transactionsList(mockMerchantId);
      expect(result.data).toEqual(mockTransactionList);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/transactions',
        params: { merchant_id: mockMerchantId },
      });
    });

    // Test case for potential errors (e.g., invalid merchant_id)
    it('should handle API errors when listing transactions', async () => {
      const errorResponse = { status: 404, body: { message: 'Merchant not found' } };
      mockRequest.mockRejectedValueOnce(new ApiError(errorResponse.status, errorResponse.body));

      await expect(client.transactionsList(mockMerchantId)).rejects.toThrow(ApiError);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/transactions',
        params: { merchant_id: mockMerchantId },
      });
    });
  });

  describe('getTransactionById', () => {
    const mockTransactionId = 'txn_xyz';
    const mockTransactionData = { id: mockTransactionId, amount: 500, status: 'succeeded' };

    it('should get a transaction by ID successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockTransactionData));
      const result = await client.getTransactionById(mockTransactionId);
      expect(result.data).toEqual(mockTransactionData);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/transactions/{transaction_id}',
        params: { transaction_id: mockTransactionId },
      });
    });

    // ... add tests for error handling (404 not found, etc.) ...
  });

  // ---- REMOVING TESTS FOR NON-EXISTENT METHODS ----
  /*
  describe('refundTransaction', () => {
    const mockTransactionId = 'txn_abc';
    const mockRefundData = { amount: 100, reason: 'duplicate' };
    const mockRefundResponse = { refund_id: 'ref_123', status: 'succeeded' };

    it('should refund a transaction successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockRefundResponse));
      // const result = await client.refundTransaction(mockTransactionId, mockRefundData); <-- Method does not exist
      // expect(result.data).toEqual(mockRefundResponse);
      // expect(mockRequest).toHaveBeenCalledWith({
      //   method: 'POST',
      //   path: `/transactions/${mockTransactionId}/refunds`,
      //   params: { transaction_id: mockTransactionId },
      //   data: mockRefundData,
      // });
      expect(true).toBe(true); // Placeholder
    });

    // ... add tests for error handling ...
  });
  */
}); 