import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { PingClient } from '../../src/client/PingClient';
import { ApiResult } from '../../src/client/core/ApiResult';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('PingClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: PingClient;

  beforeEach(() => {
    client = new PingClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('list', () => {
    it('should ping the API successfully', async () => {
      const mockResponse = { message: 'pong' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/ping',
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
      expect(result.data).toEqual(mockResponse);
    });
  });
}); 