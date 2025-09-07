import { Request, Response, NextFunction } from "express";
import winston from "winston";

// Configure logger
const transports: winston.transport[] = [new winston.transports.Console()];

// Only add file transports when not in production (not on Vercel)
if (process.env.NODE_ENV !== "production") {
  transports.push(new winston.transports.File({ filename: "logs/errors.log" }));
}

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "api-error-handler" },
  transports,
});

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    status?: number;
    details?: any;
  };
}

/**
 * Custom API error class
 */
export class APIError extends Error {
  status: number;
  code: string;
  details: any;

  constructor(
    message: string,
    status = 500,
    code = "internal_error",
    details?: any,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "APIError";
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    status: (err as APIError).status || 500,
    code: (err as APIError).code || "internal_error",
  });

  // Determine if this is a custom API error or a standard error
  const isAPIError = err instanceof APIError;

  // Prepare the error response
  const errorResponse: ErrorResponse = {
    error: {
      message: err.message || "Internal server error",
      status: isAPIError ? (err as APIError).status : 500,
      code: isAPIError ? (err as APIError).code : "internal_error",
    },
  };

  // Add details if available
  if (isAPIError && (err as APIError).details) {
    errorResponse.error.details = (err as APIError).details;
  }

  // Send the error response
  return res
    .status(isAPIError ? (err as APIError).status : 500)
    .json(errorResponse);
};

/**
 * Not found handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const err = new APIError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    "not_found",
  );
  next(err);
};
