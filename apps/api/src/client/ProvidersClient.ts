import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class ProvidersClient extends BaseClient {
/**
 * List available payment providers
 */  public async providers(): Promise<ApiResult<Types.Provider[]>> {
    return this.request({
      method: 'GET',
      path: '/providers'
    });
  }
}