import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class CheckoutSessionsClient extends BaseClient {
/**
 * Create a checkout session
 * Create a new checkout session for collecting payments
 */  public async createCheckoutSession(data: Types.CreateCheckoutSession): Promise<ApiResult<Types.CheckoutSession>> {
    return this.request({
      method: 'POST',
      path: '/checkout-sessions',
      data
    });
  }

/**
 * List checkout sessions
 * List all checkout sessions for a merchant
 */  public async listCheckoutSessions(merchant_id: string, optionalParams?: { checkout_session_id?: string, status?: string }): Promise<ApiResult<Types.CheckoutSession[]>> {
    return this.request({
      method: 'GET',
      path: '/checkout-sessions',
      params: { merchant_id: merchant_id, ...optionalParams }
    });
  }

/**
 * Get a checkout session by ID
 * Get details of a specific checkout session
 */  public async getCheckoutSession(session_id: string): Promise<ApiResult<Types.CheckoutSession>> {
    return this.request({
      method: 'GET',
      path: '/checkout-sessions/{session_id}',
      params: { session_id: session_id }
    });
  }
}