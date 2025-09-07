import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class TransactionsClient extends BaseClient {
/**
 * List transactions for a merchant
 */  public async transactionsList(merchant_id: string): Promise<ApiResult<Types.Transaction[]>> {
    return this.request({
      method: 'GET',
      path: '/transactions',
      params: { merchant_id: merchant_id }
    });
  }

/**
 * Get transaction details
 * Get details of a specific transaction by its ID
 */  public async getTransactionById(transaction_id: string): Promise<ApiResult<Types.Transaction>> {
    return this.request({
      method: 'GET',
      path: '/transactions/{transaction_id}',
      params: { transaction_id: transaction_id }
    });
  }
}