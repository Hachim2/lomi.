export interface ApiRequestOptions {
  method: string;
  path: string;
  params?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
}