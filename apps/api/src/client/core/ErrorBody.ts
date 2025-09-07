export interface ErrorBody {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}