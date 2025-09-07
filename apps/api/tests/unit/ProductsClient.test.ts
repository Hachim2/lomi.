import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ProductsClient } from '../../src/client/ProductsClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('ProductsClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: ProductsClient;

  beforeEach(() => {
    client = new ProductsClient(mockBaseUrl, mockApiKey);
    mockFetch.mockClear();
  });

  describe('create', () => {
    const mockCreateProductData: Types.CreateProduct = {
      name: 'Test Product',
      description: 'A test product',
      price: 1000,
      currency_code: Types.CurrencyCode.USD,
      image_url: 'https://example.com/image.jpg',
      is_active: true,
      display_on_storefront: true
    };

    const mockProductResponse: Types.Product = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      merchant_id: '123e4567-e89b-12d3-a456-426614174001',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      name: mockCreateProductData.name,
      description: mockCreateProductData.description,
      price: mockCreateProductData.price,
      currency_code: mockCreateProductData.currency_code,
      image_url: mockCreateProductData.image_url,
      is_active: mockCreateProductData.is_active,
      display_on_storefront: mockCreateProductData.display_on_storefront,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should create a product successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockProductResponse)
      } as Response);

      const result = await client.create(mockCreateProductData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/products',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          },
          body: JSON.stringify(mockCreateProductData)
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockProductResponse);
    });
  });

  describe('list', () => {
    const mockMerchantId = 'merchant_prod_1';
    const mockProductList = [{ id: 'prod_1', name: 'Test Product' }];

    it('should list products successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProductList)
      } as Response);

      const result = await client.list(mockMerchantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/products?merchant_id=${mockMerchantId}`,
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
      expect(result.data).toEqual(mockProductList);
    });

    // Test case for when list is called without merchant_id (should error)
    // it('should handle missing merchant_id', async () => {
      // Assuming the method requires merchant_id, test the error path
      // mockRequest.mockRejectedValueOnce(new ApiError(400, { message: 'Missing merchant_id' }));
      // await expect(client.list()).rejects.toThrow(ApiError);
    // });

    // ... add tests for error handling ...
  });

  describe('get', () => {
    const mockProductId = '123e4567-e89b-12d3-a456-426614174001';
    const mockProduct: Types.Product = {
      product_id: mockProductId,
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Test Product',
      description: 'A test product',
      price: 1000,
      currency_code: Types.CurrencyCode.USD,
      image_url: 'https://example.com/image.jpg',
      is_active: true,
      display_on_storefront: true,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should get a product successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProduct)
      } as Response);

      const result = await client.getProduct(mockProductId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/products/${mockProductId}`,
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
      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('updateProductStatus', () => {
    const mockProductId = 'prod_def';
    const mockUpdateData = { is_active: false };

    it('should update a product status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined)
      } as Response);

      const result = await client.updateProductStatus(mockProductId, mockUpdateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/products/${mockProductId}`,
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
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    });
  });

  describe('delete', () => {
    const mockProductId = '123e4567-e89b-12d3-a456-426614174001';

    it('should delete a product successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined)
      } as Response);

      const result = await client.deleteProduct(mockProductId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.test.com/products/${mockProductId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': mockApiKey
          }
        })
      );

      expect(result).toBeInstanceOf(ApiResult);
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    });
  });
}); 