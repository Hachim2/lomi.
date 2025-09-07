import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

/**
 * Extended Request interface to include organizationId
 */
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      merchantId?: string;
      apiEnvironment?: "test" | "live";
    }
  }
}

/**
 * Middleware to authenticate API requests using JWT
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: {
          message: "Authorization header missing",
        },
      });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: {
          message: "Bearer token missing",
        },
      });
    }

    // Verify the JWT token using the JWT_SECRET from env variables
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is missing in environment variables");
      return res.status(500).json({
        error: {
          message: "Server configuration error",
        },
      });
    }

    try {
      // Verify and decode the JWT token
      const decoded = jwt.verify(token, jwtSecret) as {
        organizationId: string;
        environment?: string;
      };

      // Set the organization ID and environment from the token
      req.organizationId = decoded.organizationId;
      req.apiEnvironment = (decoded.environment as "test" | "live") || "live";

      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: {
          message: "Invalid token",
          details: (jwtError as Error).message,
        },
      });
    }
  } catch (error: any) {
    return res.status(401).json({
      error: {
        message: "Invalid token",
        details: error.message,
      },
    });
  }
};

/**
 * Middleware to authenticate API requests using API key
 */
export const authenticateAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: "API key missing",
        },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials missing in environment variables");
      return res.status(500).json({
        error: {
          message: "Server configuration error",
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Use the existing validate_api_key function from our migrations
    const { data, error } = await supabase.rpc("validate_api_key", {
      p_api_key: apiKey,
    });

    if (error || !data || data.length === 0) {
      return res.status(401).json({
        error: {
          message: "Invalid API key",
        },
      });
    }

    // Extract the merchant and organization IDs from the result
    const validationResult = data[0];

    if (!validationResult.is_active) {
      return res.status(401).json({
        error: {
          message: "API key is inactive",
        },
      });
    }

    if (
      validationResult.expiration_date &&
      new Date(validationResult.expiration_date) < new Date()
    ) {
      return res.status(401).json({
        error: {
          message: "API key has expired",
        },
      });
    }

    // Set organization and merchant IDs on the request object for later use
    req.organizationId = validationResult.organization_id;
    req.merchantId = validationResult.merchant_id;
    req.apiEnvironment = validationResult.environment;

    next();
  } catch (error: any) {
    console.error("API key validation error:", error);
    return res.status(500).json({
      error: {
        message: "Failed to authenticate API key",
        details: error.message,
      },
    });
  }
};

/**
 * Middleware to add environment flag to API responses
 */
export const addEnvironmentToResponse = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const originalJson = res.json;

  // Override the json method
  res.json = function (body: any): Response {
    // Only add environment info if we have it and this is a successful response
    if (req.apiEnvironment && body && !body.error) {
      // For responses with data property, add environment to data
      if (body.data) {
        body.data.environment = req.apiEnvironment;

        // Add test flag if this is the test environment
        if (req.apiEnvironment === "test") {
          body.data.test = true;
        }
      }
      // For direct responses, add environment at the root level
      else {
        body.environment = req.apiEnvironment;

        // Add test flag if this is the test environment
        if (req.apiEnvironment === "test") {
          body.test = true;
        }
      }
    }

    // Call the original json method
    return originalJson.call(this, body);
  };

  next();
};
