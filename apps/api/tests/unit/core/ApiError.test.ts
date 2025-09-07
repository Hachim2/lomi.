import { describe, expect, it } from '@jest/globals';
import { ApiError } from '../../../src/client/core/ApiError';
import { ErrorBody } from '../../../src/client/core/ErrorBody';

describe('ApiError', () => {
  it('should create an instance with status and body', () => {
    const status = 400;
    const body: ErrorBody = {
      message: 'Validation error',
      code: 'INVALID_INPUT',
      details: { field: 'email' }
    };

    const error = new ApiError(status, body);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(status);
    expect(error.body).toBe(body);
    expect(error.message).toBe(`API Error ${status}: ${JSON.stringify(body)}`);
    expect(error.name).toBe('ApiError');
  });

  it('should create an instance with minimal body', () => {
    const status = 500;
    const body: ErrorBody = {
      message: 'Internal server error'
    };

    const error = new ApiError(status, body);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.body).toBe(body);
    expect(error.message).toBe(`API Error ${status}: ${JSON.stringify(body)}`);
  });

  it('should handle empty body', () => {
    const status = 404;
    const body = {} as ErrorBody;

    const error = new ApiError(status, body);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.body).toBe(body);
    expect(error.message).toBe(`API Error ${status}: {}`);
  });
}); 