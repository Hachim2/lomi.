import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class SubscriptionsClient extends BaseClient {
/**
 * Create a subscription plan
 */  public async create(data?: Types.CreateSubscriptionPlan): Promise<ApiResult<Types.SubscriptionPlan>> {
    return this.request({
      method: 'POST',
      path: '/subscriptions',
      data
    });
  }

/**
 * List subscription plans for a merchant
 */  public async list(merchant_id: string, optionalParams?: { limit?: string, offset?: string }): Promise<ApiResult<Types.SubscriptionPlan[]>> {
    return this.request({
      method: 'GET',
      path: '/subscriptions',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }
}