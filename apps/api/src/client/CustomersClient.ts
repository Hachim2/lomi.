import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class CustomersClient extends BaseClient {
/**
 * Create a customer
 * Create a new customer for a merchant
 */  public async createCustomer(data: Types.CreateCustomer): Promise<ApiResult<Types.Customer>> {
    return this.request({
      method: 'POST',
      path: '/customers',
      data
    });
  }

/**
 * List customers
 * List all customers for a merchant
 */  public async listCustomers(merchant_id: string, optionalParams?: { email?: string, phone_number?: string }): Promise<ApiResult<Types.Customer[]>> {
    return this.request({
      method: 'GET',
      path: '/customers',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get customer details
 * Get details of a specific customer
 */  public async getCustomer(customer_id: string): Promise<ApiResult<Types.Customer>> {
    return this.request({
      method: 'GET',
      path: '/customers/{customer_id}',
      params: { customer_id: customer_id }
    });
  }

/**
 * Update customer
 * Update customer details
 */  public async updateCustomer(customer_id: string, data: Record<string, unknown>): Promise<ApiResult<Types.Customer>> {
    return this.request({
      method: 'PATCH',
      path: '/customers/{customer_id}',
      params: { customer_id: customer_id },
      data
    });
  }

/**
 * Delete customer
 * Delete a customer
 */  public async deleteCustomer(customer_id: string): Promise<ApiResult<void>> {
    return this.request({
      method: 'DELETE',
      path: '/customers/{customer_id}',
      params: { customer_id: customer_id }
    });
  }
}