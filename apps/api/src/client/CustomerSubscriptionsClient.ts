import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class CustomerSubscriptionsClient extends BaseClient {
/**
 * List customer subscriptions
 * List all subscriptions for a merchant
 */  public async listCustomerSubscriptions(merchant_id: string, optionalParams?: { customer_id?: string, status?: string }): Promise<ApiResult<Types.Subscription[]>> {
    return this.request({
      method: 'GET',
      path: '/customer-subscriptions',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get subscription details
 * Get details of a specific subscription
 */  public async getSubscription(subscription_id: string, merchant_id: string): Promise<ApiResult<Types.Subscription>> {
    return this.request({
      method: 'GET',
      path: '/customer-subscriptions/{subscription_id}',
      params: { subscription_id: subscription_id, merchant_id: merchant_id }
    });
  }

/**
 * Update subscription
 * Update subscription details
 */  public async updateSubscription(subscription_id: string, merchant_id: string, data?: Record<string, unknown>): Promise<ApiResult<Types.Subscription>> {
    return this.request({
      method: 'PATCH',
      path: '/customer-subscriptions/{subscription_id}',
      params: { subscription_id: subscription_id, merchant_id: merchant_id },
      data
    });
  }

/**
 * Cancel subscription
 * Cancel a subscription
 */  public async cancelSubscription(subscription_id: string, merchant_id: string): Promise<ApiResult<void>> {
    return this.request({
      method: 'DELETE',
      path: '/customer-subscriptions/{subscription_id}',
      params: { subscription_id: subscription_id, merchant_id: merchant_id }
    });
  }
}