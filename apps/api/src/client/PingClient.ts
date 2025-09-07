import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class PingClient extends BaseClient {
/**
 * Ping the API
 */  public async list(): Promise<ApiResult<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      path: '/ping'
    });
  }
}