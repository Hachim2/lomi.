import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { CustomersClient } from '../../src/client/CustomersClient';
import { ApiResult } from '../../src/client/core/ApiResult';
import * as Types from '../../src/types/api';
import { BaseClient } from '../../src/client/BaseClient';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('CustomersClient', () => {
  const mockBaseUrl = 'https://api.test.com';
  const mockApiKey = 'test-api-key';
  let client: CustomersClient;
  let mockRequest: any; // Spy instance

  beforeEach(() => {
    client = new CustomersClient(mockBaseUrl, mockApiKey);
    mockRequest = jest.spyOn(BaseClient.prototype as any, 'request');
  });

  afterEach(() => {
    mockRequest.mockRestore(); // Restore original method
  });

  describe('createCustomer', () => {
    const mockCreateCustomerData: Types.CreateCustomer = {
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174123',
      email: 'customer@example.com',
      phone_number: '+1234567890',
      name: 'John Doe',
      country: 'US',
      city: 'New York',
      address: '123 Main St',
      postal_code: '10001',
      is_business: false,
      metadata: { source: 'test' }
    };

    const mockCustomerResponse: Types.Customer = {
      customer_id: '123e4567-e89b-12d3-a456-426614174001',
      merchant_id: mockCreateCustomerData.merchant_id,
      organization_id: mockCreateCustomerData.organization_id,
      email: mockCreateCustomerData.email,
      phone_number: mockCreateCustomerData.phone_number,
      name: mockCreateCustomerData.name,
      country: mockCreateCustomerData.country,
      city: mockCreateCustomerData.city,
      address: mockCreateCustomerData.address,
      postal_code: mockCreateCustomerData.postal_code,
      is_business: mockCreateCustomerData.is_business,
      metadata: mockCreateCustomerData.metadata,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should create a customer successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(201, mockCustomerResponse));
      const result = await client.createCustomer(mockCreateCustomerData);
      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockCustomerResponse);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/customers',
        data: mockCreateCustomerData,
      });
    });
  });

  describe('listCustomers', () => {
    const mockMerchantId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCustomers: Types.Customer[] = [
      {
        customer_id: '123e4567-e89b-12d3-a456-426614174001',
        merchant_id: mockMerchantId,
        organization_id: '123e4567-e89b-12d3-a456-426614174123',
        email: 'customer1@example.com',
        phone_number: '+1234567890',
        name: 'John Doe',
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      },
      {
        customer_id: '123e4567-e89b-12d3-a456-426614174002',
        merchant_id: mockMerchantId,
        organization_id: '123e4567-e89b-12d3-a456-426614174123',
        email: 'customer2@example.com',
        phone_number: '+1234567891',
        name: 'Jane Smith',
        created_at: new Date('2024-01-17T00:00:00Z'),
        updated_at: new Date('2024-01-17T00:00:00Z')
      }
    ];

    it('should list customers successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockCustomers));
      const result = await client.listCustomers(mockMerchantId);
      expect(result.data).toEqual(mockCustomers);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customers',
        params: { merchant_id: mockMerchantId },
      });
    });

    it('should list customers with filters successfully', async () => {
      const mockMerchantId = 'merchant_123';
      const filters = {
        email: 'customer1@example.com',
        phone_number: '+1234567890'
      };
      const mockFilteredList = [mockCustomers[0]];

      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockFilteredList));

      const result = await client.listCustomers(mockMerchantId, filters);

      expect(result.data).toEqual(mockFilteredList);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customers',
        params: { merchant_id: mockMerchantId, ...filters },
      });
    });
  });

  describe('getCustomer', () => {
    const mockCustomerId = '123e4567-e89b-12d3-a456-426614174001';
    const mockCustomer: Types.Customer = {
      customer_id: mockCustomerId,
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174123',
      email: 'customer@example.com',
      phone_number: '+1234567890',
      name: 'John Doe',
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should get a customer successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockCustomer));
      const result = await client.getCustomer(mockCustomerId);
      expect(result.data).toEqual(mockCustomer);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/customers/{customer_id}',
        params: { customer_id: mockCustomerId },
      });
    });
  });

  describe('updateCustomer', () => {
    const mockCustomerId = '123e4567-e89b-12d3-a456-426614174001';
    const mockUpdateData = {
      name: 'Johnny Doe Jr',
      metadata: { updated: true }
    };

    const mockUpdatedCustomer: Types.Customer = {
      customer_id: mockCustomerId,
      merchant_id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174123',
      email: 'customer@example.com',
      phone_number: '+1234567890',
      name: mockUpdateData.name,
      metadata: mockUpdateData.metadata,
      created_at: new Date('2024-01-17T00:00:00Z'),
      updated_at: new Date('2024-01-17T00:00:00Z')
    };

    it('should update a customer successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(200, mockUpdatedCustomer));
      const result = await client.updateCustomer(mockCustomerId, mockUpdateData);
      expect(result.data).toEqual(mockUpdatedCustomer);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/customers/{customer_id}',
        params: { customer_id: mockCustomerId },
        data: mockUpdateData,
      });
    });
  });

  describe('deleteCustomer', () => {
    const mockCustomerId = '123e4567-e89b-12d3-a456-426614174001';

    it('should delete a customer successfully', async () => {
      mockRequest.mockResolvedValueOnce(new ApiResult(204, undefined));
      const result = await client.deleteCustomer(mockCustomerId);
      expect(result.status).toBe(204);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/customers/{customer_id}',
        params: { customer_id: mockCustomerId },
      });
    });
  });
}); 