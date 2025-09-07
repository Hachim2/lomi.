import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { BaseClient } from '../../src/client/BaseClient';
import { ApiError } from '../../src/client/core/ApiError';
import { ApiResult } from '../../src/client/core/ApiResult';
import { ApiRequestOptions } from '../../src/client/core/ApiRequestOptions';

// Create a test class that extends BaseClient to access protected methods
class TestClient extends BaseClient {
  public async testRequest<T>(options: ApiRequestOptions): Promise<ApiResult<T>> {
    return this.request<T>(options);
  }
}

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('BaseClient', () => {
  let client: TestClient;
  
  beforeEach(() => {
    client = new TestClient('https://api.test.com', 'test-api-key');
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be instantiated with baseUrl', () => {
    const client = new BaseClient('https://api.test.com');
    expect(client).toBeInstanceOf(BaseClient);
  });

  it('should be instantiated with baseUrl and apiKey', () => {
    const client = new BaseClient('https://api.test.com', 'test-api-key');
    expect(client).toBeInstanceOf(BaseClient);
  });
  
  it('should make a successful GET request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' })
    } as Response);
    
    const result = await client.testRequest<{ data: string }>({
      method: 'GET',
      path: '/test'
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'test-api-key'
        }
      })
    );
    
    expect(result.data).toEqual({ data: 'test' });
  });
  
  it('should make a successful POST request with data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: '123', name: 'Test' })
    } as Response);
    
    const result = await client.testRequest<{ id: string; name: string }>({
      method: 'POST',
      path: '/test',
      data: { name: 'Test' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'test-api-key'
        },
        body: JSON.stringify({ name: 'Test' })
      })
    );
    
    expect(result.data).toEqual({ id: '123', name: 'Test' });
  });
  
  it('should handle path parameters correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '123', name: 'Test' })
    } as Response);
    
    await client.testRequest<{ id: string; name: string }>({
      method: 'GET',
      path: '/test/{id}',
      params: { id: '123' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test/123',
      expect.any(Object)
    );
  });
  
  it('should handle query parameters correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' })
    } as Response);
    
    await client.testRequest<{ data: string }>({
      method: 'GET',
      path: '/test',
      params: { page: 1, limit: 10 }
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test?page=1&limit=10',
      expect.any(Object)
    );
  });
  
  it('should handle 204 No Content responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined)
    } as Response);
    
    const result = await client.testRequest<void>({
      method: 'DELETE',
      path: '/test/123'
    });
    
    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });
  
  it('should throw ApiError for non-OK responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        code: 'INVALID_REQUEST',
        message: 'Invalid request'
      })
    } as Response);
    
    await expect(client.testRequest<any>({
      method: 'GET',
      path: '/test'
    })).rejects.toThrow(ApiError);
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        code: 'INVALID_REQUEST',
        message: 'Invalid request'
      })
    } as Response);
    
    try {
      await client.testRequest<any>({
        method: 'GET',
        path: '/test'
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(400);
        expect(error.body.message).toBe('Invalid request');
        expect(error.body.code).toBe('INVALID_REQUEST');
      }
    }
  });
  
  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(client.testRequest<any>({
      method: 'GET',
      path: '/test'
    })).rejects.toThrow(ApiError);
    
    try {
      await client.testRequest<any>({
        method: 'GET',
        path: '/test'
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(500);
        expect(error.body.message).toBe('Network error');
      }
    }
  });
  
  it('should handle JSON parse errors in error responses', async () => {
    // Mock a response that fails to parse JSON when json() is called
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.reject(new Error('Invalid JSON'))
    } as Response);
    
    try {
      await client.testRequest<any>({
        method: 'GET',
        path: '/test'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(500);
        expect(error.body.message).toBe('Network error');
      }
    }
  });

  it('should handle malformed error JSON responses', async () => {
    // Mock a response with a valid JSON but missing expected fields
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ someOtherField: 'data' }) // Missing 'message' and 'code'
    } as Response);

    try {
      await client.testRequest<any>({ method: 'GET', path: '/test' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(400); // Status from the response
        expect(error.body.message).toBe('Unknown error'); // Default message
        expect(error.body.code).toBeUndefined(); // Default code
      }
    }
  });
}); 