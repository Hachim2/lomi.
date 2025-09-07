import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class MerchantsClient extends BaseClient {
/**
 * Get merchant details
 */  public async get(merchant_id: string): Promise<ApiResult<Types.Merchant>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}',
      params: { merchant_id: merchant_id }
    });
  }

/**
 * List connected payment providers for a merchant
 */  public async merchantProviders(merchant_id: string): Promise<ApiResult<Types.ConnectedProvider[]>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/providers',
      params: { merchant_id: merchant_id }
    });
  }

/**
 * Create a subscription plan for a merchant
 */  public async create(merchant_id: string, data?: Types.CreateSubscriptionPlan): Promise<ApiResult<Types.SubscriptionPlan>> {
    return this.request({
      method: 'POST',
      path: '/merchants/{merchant_id}/subscriptions',
      params: { merchant_id: merchant_id },
      data
    });
  }

/**
 * List subscription plans for a merchant
 */  public async list(merchant_id: string, optionalParams?: { limit?: string, offset?: string }): Promise<ApiResult<Types.SubscriptionPlan[]>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/subscriptions',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get subscription plan details for a merchant
 * Get details of a specific subscription plan belonging to a merchant
 */  public async getSubscriptionPlan(merchant_id: string, plan_id: string): Promise<ApiResult<Types.SubscriptionPlan>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/subscriptions/{plan_id}',
      params: { merchant_id: merchant_id, plan_id: plan_id }
    });
  }

/**
 * Update subscription plan
 * Update specific fields (is_active, metadata) of a subscription plan. Core details are immutable via API.
 */  public async updateSubscriptionPlan(merchant_id: string, plan_id: string, data: Record<string, unknown>): Promise<ApiResult<Types.SubscriptionPlan>> {
    return this.request({
      method: 'PATCH',
      path: '/merchants/{merchant_id}/subscriptions/{plan_id}',
      params: { merchant_id: merchant_id, plan_id: plan_id },
      data
    });
  }

/**
 * Delete subscription plan
 * Delete a subscription plan belonging to a merchant
 */  public async deleteSubscriptionPlan(merchant_id: string, plan_id: string): Promise<ApiResult<void>> {
    return this.request({
      method: 'DELETE',
      path: '/merchants/{merchant_id}/subscriptions/{plan_id}',
      params: { merchant_id: merchant_id, plan_id: plan_id }
    });
  }

/**
 * Get merchant monthly recurring revenue
 * Retrieve current monthly recurring revenue
 */  public async getMerchantMrr(merchant_id: string): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/mrr',
      params: { merchant_id: merchant_id }
    });
  }

/**
 * Get merchant annual recurring revenue
 * Retrieve current annual recurring revenue
 */  public async getMerchantArr(merchant_id: string): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/arr',
      params: { merchant_id: merchant_id }
    });
  }

/**
 * Get merchant account balance
 * Retrieve current account balance for a merchant
 */  public async getMerchantBalance(merchant_id: string, optionalParams?: { currency_code?: string }): Promise<ApiResult<Record<string, unknown>[]>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/balance',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * List merchant accounts
 * Retrieve all accounts belonging to a merchant with their balances
 */  public async listMerchantAccounts(merchant_id: string, optionalParams?: { currency_code?: string }): Promise<ApiResult<Types.MerchantAccount[]>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/accounts',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get transaction summary for a merchant
 * Retrieve summary of transactions including total counts and amounts by status
 */  public async getMerchantTransactionsSummary(merchant_id: string, optionalParams?: { start_date?: string, end_date?: string, currency_code?: string }): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      path: '/merchants/{merchant_id}/transactions/summary',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }
}