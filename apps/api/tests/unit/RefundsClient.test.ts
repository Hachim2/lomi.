import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { RefundsClient } from '../../src/client/RefundsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('RefundsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: RefundsClient;

  beforeEach(() => {
    client = new RefundsClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('create', () => {
    const mockCreateRefundData: Types.CreateRefund = {
      transaction_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 1000,
      reason: 'Customer request',
      metadata: { source: 'test' }
    };

    const mockRefundResponse: Types.Refund = {
      refund_id: '123e4567-e89b-12d3-a456-426614174001',
      transaction_id: mockCreateRefundData.transaction_id,
      amount: mockCreateRefundData.amount,
      refunded_amount: mockCreateRefundData.amount,
      fee_amount: 0,
      reason: mockCreateRefundData.reason,
      metadata: mockCreateRefundData.metadata,
      status: Types.RefundStatus.pending,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should create a refund successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockRefundResponse)
      } as Response);

      const result = await client.createRefund(mockCreateRefundData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/refunds',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockCreateRefundData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockRefundResponse);
    });
  });

  describe('get', () => {
    const mockRefundId = '123e4567-e89b-12d3-a456-426614174001';
    const mockRefund: Types.Refund = {
      refund_id: mockRefundId,
      transaction_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 1000,
      refunded_amount: 1000,
      fee_amount: 0,
      status: Types.RefundStatus.completed,
      reason: 'Customer request',
      metadata: { source: 'test' },
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should get a refund successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRefund)
      } as Response);

      const result = await client.getRefund(mockRefundId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/refunds/${mockRefundId}`,
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
      expect(result.data).toEqual(mockRefund);
    });
  });

  describe('patch', () => {
    const mockRefundId = '123e4567-e89b-12d3-a456-426614174001';
    const mockUpdateData = {
      status: Types.RefundStatus.completed,
      metadata: { reason: 'Processed' }
    };

    const mockUpdatedRefund: Types.Refund = {
      refund_id: mockRefundId,
      transaction_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 1000,
      refunded_amount: 1000,
      fee_amount: 0,
      status: Types.RefundStatus.completed,
      reason: 'Customer request',
      metadata: { reason: 'Processed' },
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should update a refund successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUpdatedRefund)
      } as Response);

      const result = await client.updateRefund(mockRefundId, mockUpdateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/refunds/${mockRefundId}`,
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
      expect(result.data).toEqual(mockUpdatedRefund);
    });
  });
}); 