import { describe, expect, it } from '@jest/globals';
import { ApiResult } from '../../../src/client/core/ApiResult';

describe('ApiResult', () => {
  it('should create an instance with status and data', () => {
    const status = 200;
    const data = { id: '123', name: 'Test' };

    const result = new ApiResult(status, data);

    expect(result).toBeInstanceOf(ApiResult);
    expect(result.status).toBe(status);
    expect(result.data).toBe(data);
  });

  it('should handle undefined data', () => {
    const status = 204;
    const data = undefined;

    const result = new ApiResult(status, data);

    expect(result).toBeInstanceOf(ApiResult);
    expect(result.status).toBe(status);
    expect(result.data).toBeUndefined();
  });

  it('should handle null data', () => {
    const status = 200;
    const data = null;

    const result = new ApiResult(status, data);

    expect(result).toBeInstanceOf(ApiResult);
    expect(result.status).toBe(status);
    expect(result.data).toBeNull();
  });

  it('should handle array data', () => {
    const status = 200;
    const data = [1, 2, 3];

    const result = new ApiResult(status, data);

    expect(result).toBeInstanceOf(ApiResult);
    expect(result.status).toBe(status);
    expect(result.data).toBe(data);
  });
}); 