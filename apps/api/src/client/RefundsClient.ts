import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class RefundsClient extends BaseClient {
/**
 * Create a refund
 * Initiate a refund for a transaction
 */  public async createRefund(data: Types.CreateRefund): Promise<ApiResult<Types.Refund>> {
    return this.request({
      method: 'POST',
      path: '/refunds',
      data
    });
  }

/**
 * Get refund details
 * Get details of a specific refund
 */  public async getRefund(refund_id: string): Promise<ApiResult<Types.Refund>> {
    return this.request({
      method: 'GET',
      path: '/refunds/{refund_id}',
      params: { refund_id: refund_id }
    });
  }

/**
 * Update refund status
 * Update the status of a refund
 */  public async updateRefund(refund_id: string, data: Record<string, unknown>): Promise<ApiResult<Types.Refund>> {
    return this.request({
      method: 'PATCH',
      path: '/refunds/{refund_id}',
      params: { refund_id: refund_id },
      data
    });
  }
}