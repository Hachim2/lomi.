import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * List available payment providers
 */
export const listProviders = async (req: Request, res: Response) => {
  try {
    // Extract merchant ID from request (set by auth middleware)
    // @ts-ignore - merchantId is set by auth middleware
    const merchantId = req.merchantId;

    if (!merchantId) {
      return res.status(401).json({
        error: {
          message: "Authentication required",
          details:
            "Valid merchant credentials required to access this resource",
        },
      });
    }

    // Get available payment providers using RPC function
    const { data, error } = await supabase.rpc("list_providers", {
      p_merchant_id: merchantId,
    });

    if (error) {
      console.error("Error retrieving providers:", error);
      return res.status(500).json({
        error: {
          message: "Failed to retrieve payment providers",
          details: error.message,
        },
      });
    }

    // Filter providers to include only connected ones
    const connectedProviders = data.filter(
      (provider: any) => provider.is_connected,
    );

    // Return the filtered providers list
    res.json({
      data: connectedProviders.map((provider: any) => ({
        code: provider.code,
        name: provider.name,
        description: provider.description,
        payment_methods: provider.payment_methods,
        is_connected: provider.is_connected,
      })),
    });
  } catch (error: any) {
    console.error("Error in listProviders:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        details: error.message,
      },
    });
  }
};
