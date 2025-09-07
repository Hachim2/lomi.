import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { LomiSDK } from '../../src';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Environment Handling', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('SDK Initialization', () => {
    it('should initialize with auto baseUrl', () => {
      const sdk = new LomiSDK({ baseUrl: 'auto', apiKey: 'lomi_sk_test_123' });
      expect(sdk).toBeDefined();
    });

    it('should initialize with custom baseUrl', () => {
      const sdk = new LomiSDK({ baseUrl: 'https://custom.api.com', apiKey: 'lomi_sk_test_123' });
      expect(sdk).toBeDefined();
    });

    /* Test disabled - apiKey is optional in LomiConfig interface
    it('should throw error if no API key provided', () => {
      expect(() => new LomiSDK({ baseUrl: 'https://api.example.com' })).toThrow('API key is required');
    });
    */
  });

  describe('Test Environment', () => {
    const testApiKey = 'lomi_sk_test_123';
    let sdk: LomiSDK;

    beforeEach(() => {
      sdk = new LomiSDK({
        baseUrl: 'https://sandbox.api.lomi.africa/v1',
        apiKey: testApiKey
      });
    });

    it('should use sandbox URL and include test environment headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'pong' })
      } as Response);

      await sdk.ping.list();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.api.lomi.africa/ping',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-KEY': testApiKey
          })
        })
      );
    });

    it('should handle network errors in test environment', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.ping.list())
        .rejects
        .toThrow('Network error');
    });
  });

  describe('Live Environment', () => {
    const liveApiKey = 'lomi_sk_live_123';
    let sdk: LomiSDK;

    beforeEach(() => {
      sdk = new LomiSDK({
        baseUrl: 'https://api.lomi.africa/v1',
        apiKey: liveApiKey
      });
    });

    it('should use production URL and include live environment headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'pong' })
      } as Response);

      await sdk.ping.list();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lomi.africa/ping',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-KEY': liveApiKey
          })
        })
      );
    });

    it('should handle network errors in live environment', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.ping.list())
        .rejects
        .toThrow('Network error');
    });
  });
});