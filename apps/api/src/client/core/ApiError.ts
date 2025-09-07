import { ErrorBody } from './ErrorBody';

export class ApiError extends Error {
  constructor(public status: number, public body: ErrorBody) {
    super(`API Error ${status}: ${JSON.stringify(body)}`);
    this.name = 'ApiError';
  }
}