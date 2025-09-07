import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class PaymentLinksClient extends BaseClient {
/**
 * Create a payment link
 * Create a new payment link for collecting payments
 */  public async createPaymentLink(data: Types.CreatePaymentLink): Promise<ApiResult<Types.PaymentLink>> {
    return this.request({
      method: 'POST',
      path: '/payment-links',
      data
    });
  }

/**
 * List payment links
 * List all payment links for a merchant
 */  public async listPaymentLinks(merchant_id: string, optionalParams?: { link_type?: string, currency_code?: string, is_active?: string }): Promise<ApiResult<Types.PaymentLink[]>> {
    return this.request({
      method: 'GET',
      path: '/payment-links',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get payment link details
 * Get details of a specific payment link
 */  public async getPaymentLink(link_id: string): Promise<ApiResult<Types.PaymentLink>> {
    return this.request({
      method: 'GET',
      path: '/payment-links/{link_id}',
      params: { link_id: link_id }
    });
  }

/**
 * Update payment link
 * Update configurable details of a payment link. 
**Important:** Core link details (title, description, price/product/plan, currency, quantity settings) are fixed after creation and cannot be changed via the API. To modify these, create a new link.

 */  public async updatePaymentLink(link_id: string, data: Record<string, unknown>): Promise<ApiResult<Types.PaymentLink>> {
    return this.request({
      method: 'PATCH',
      path: '/payment-links/{link_id}',
      params: { link_id: link_id },
      data
    });
  }

/**
 * Delete payment link
 * Delete a payment link
 */  public async deletePaymentLink(link_id: string): Promise<ApiResult<void>> {
    return this.request({
      method: 'DELETE',
      path: '/payment-links/{link_id}',
      params: { link_id: link_id }
    });
  }
}