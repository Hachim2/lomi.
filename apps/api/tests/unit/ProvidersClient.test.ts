import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ProvidersClient } from '../../src/client/ProvidersClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('ProvidersClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: ProvidersClient;

  beforeEach(() => {
    client = new ProvidersClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('providers', () => {
    const mockProviders: Types.Provider[] = [
      {
        code: Types.ProviderCode.ORANGE,
        name: 'Orange Money',
        description: 'Mobile money service by Orange'
      },
      {
        code: Types.ProviderCode.WAVE,
        name: 'Wave',
        description: 'Digital payment service'
      },
      {
        code: Types.ProviderCode.ECOBANK,
        name: 'Ecobank',
        description: 'Pan-African banking group'
      }
    ];

    it('should list available payment providers successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProviders)
      } as Response);

      const result = await client.providers();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/providers',
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
      expect(result.data).toEqual(mockProviders);
    });
  });
}); 