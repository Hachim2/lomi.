import { ApiError } from './core/ApiError';
import { ApiRequestOptions } from './core/ApiRequestOptions';
import { ApiResult } from './core/ApiResult';
import { ErrorBody } from './core/ErrorBody';

// Define HeadersInit type if not available
type HeadersInit = Record<string, string>;

export class BaseClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  protected async request<T>(options: ApiRequestOptions): Promise<ApiResult<T>> {
    const { method, path, params, data } = options;
    
    // First replace path parameters
    let resolvedPath = path;
    const queryParams: Record<string, string> = {};
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          const placeholder = `{${key}}`;
          if (resolvedPath.includes(placeholder)) {
            resolvedPath = resolvedPath.replace(placeholder, String(value));
          } else {
            queryParams[key] = String(value);
          }
        }
      });
    }

    const url = new URL(resolvedPath, this.baseUrl);
    
    // Add remaining params as query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, any>;
        const errorBody: ErrorBody = {
          message: typeof errorData.message === 'string' ? errorData.message : 'Unknown error',
          code: typeof errorData.code === 'string' ? errorData.code : undefined,
          details: typeof errorData.details === 'object' ? errorData.details : undefined
        };
        throw new ApiError(response.status, errorBody);
      }

      if (response.status === 204) {
        return new ApiResult<T>(response.status, undefined as T);
      }

      const responseData = await response.json() as T;
      return new ApiResult(response.status, responseData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, { message: 'Network error' });
    }
  }
}