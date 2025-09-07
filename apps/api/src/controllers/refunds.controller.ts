// import { Request, Response } from "express";
// import { createClient } from "@supabase/supabase-js";
// import { z } from "zod";
// import * as Types from '../types/api'; // Import generated types

// // Initialize Supabase client
// const supabaseUrl = process.env.SUPABASE_URL || "";
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// const supabase = createClient(supabaseUrl, supabaseServiceKey);

// // // Refund request validation schema
// // const createRefundSchema = z.object({
// //   transaction_id: z.string().uuid(),
// //   amount: z.number().positive(),
// //   reason: z.string().optional(),
// //   metadata: z.record(z.string()).optional(),
// // });

// // const updateRefundSchema = z.object({
// //   status: z.enum(["pending", "completed", "failed"]),
// // });

// // /**
// //  * Create a new refund
// //  */
// // export const createRefund = async (req: Request, res: Response) => {
// //   try {
// //     const merchantId = req.merchantId;
// //     const organizationId = req.organizationId;

// //     if (!merchantId || !organizationId) {
// //       return res.status(401).json({
// //         error: {
// //           message: "Merchant ID or Organization ID not found",
// //         },
// //       });
// //     }

// //     // Validate request body
// //     const validationResult = createRefundSchema.safeParse(req.body);

// //     if (!validationResult.success) {
// //       return res.status(400).json({
// //         error: {
// //           message: "Invalid request body",
// //           details: validationResult.error.format(),
// //         },
// //       });
// //     }

// //     const { transaction_id, amount, reason, metadata } = validationResult.data;

// //     // Create refund using RPC function
// //     const { data, error } = await supabase.rpc("create_refund", {
// //       p_merchant_id: merchantId,
// //       p_transaction_id: transaction_id,
// //       p_amount: amount,
// //       p_reason: reason,
// //       p_metadata: metadata,
// //     });

// //     if (error) {
// //       console.error("Error creating refund:", error);

// //       // Check for specific error messages
// //       if (error.message.includes("Transaction not found")) {
// //         return res.status(404).json({
// //           error: {
// //             message:
// //               "Transaction not found or does not belong to this merchant",
// //           },
// //         });
// //       }

// //       if (error.message.includes("Cannot refund a transaction")) {
// //         return res.status(400).json({
// //           error: {
// //             message: error.message,
// //           },
// //         });
// //       }

// //       if (error.message.includes("Refund amount cannot exceed")) {
// //         return res.status(400).json({
// //           error: {
// //             message: "Refund amount cannot exceed the transaction amount",
// //           },
// //         });
// //       }

// //       return res.status(500).json({
// //         error: {
// //           message: "Failed to create refund",
// //           details: error.message,
// //         },
// //       });
// //     }

// //     // Fetch the newly created refund to return details
// //     const { data: refundData, error: getError } = await supabase.rpc(
// //       "get_refund",
// //       {
// //         p_refund_id: data,
// //         p_merchant_id: merchantId,
// //       },
// //     );

// //     if (getError || !refundData || refundData.length === 0) {
// //       console.error("Error retrieving created refund:", getError);
// //       return res.status(201).json({
// //         data: {
// //           refund_id: data,
// //           status: "pending",
// //         },
// //       });
// //     }

// //     // Return full refund details
// //     const refund = refundData[0];
// //     res.status(201).json({
// //       data: {
// //         refund_id: refund.refund_id,
// //         transaction_id: refund.transaction_id,
// //         amount: refund.amount,
// //         refunded_amount: refund.refunded_amount,
// //         fee_amount: refund.fee_amount,
// //         reason: refund.reason,
// //         status: refund.status,
// //         metadata: refund.metadata,
// //         created_at: refund.created_at,
// //         updated_at: refund.updated_at,
// //       },
// //     });
// //   } catch (error: any) {
// //     console.error("Error in createRefund:", error);
// //     res.status(500).json({
// //       error: {
// //         message: "Internal server error",
// //         details: error.message,
// //       },
// //     });
// //   }
// // };

// // Error codes
// enum ErrorCode {
//   INVALID_REQUEST = 'INVALID_REQUEST',
//   UNAUTHORIZED = 'UNAUTHORIZED',
//   FORBIDDEN = 'FORBIDDEN',
//   NOT_FOUND = 'NOT_FOUND',
//   CONFLICT = 'CONFLICT',
//   DATABASE_ERROR = 'DATABASE_ERROR',
//   INTERNAL_ERROR = 'INTERNAL_ERROR',
// }

// // Standardized error response creator
// function createErrorResponse(
//   status: number,
//   code: string,
//   message: string,
//   details?: any
// ) {
//   return {
//     error: {
//       status,
//       code,
//       message,
//       details,
//       timestamp: new Date().toISOString(),
//     }
//   };
// }

// // Consistent error logging
// function logError(error: any, context: string, req: Request) {
//   // Use req.merchantId if available from auth middleware
//   const merchantId = req.merchantId || req.params?.id || 'N/A';
//   console.error(`Error in ${context}:`, {
//     error: error.message || error,
//     stack: error.stack, // Include stack trace for better debugging
//     path: req.path,
//     method: req.method,
//     ip: req.ip,
//     merchantId: merchantId,
//     requestBody: req.body, // Log request body for context
//     requestParams: req.params, // Log path parameters
//     requestQuery: req.query, // Log query parameters
//   });
// }

// // Helper function to handle Supabase/PostgREST errors consistently
// function handleDatabaseError(error: any, req: Request, context: string) {
//   logError(error, context, req);

//   let status = 500;
//   let code = ErrorCode.DATABASE_ERROR;
//   let message = "Database operation failed";
//   let details: any = {
//     db_code: error.code,
//     db_message: error.message,
//     db_hint: error.hint,
//     db_details: error.details
//   };

//   switch (error.code) {
//     case 'PGRST116': // Resource not found (PostgREST specific)
//     case '22P02':    // Invalid input syntax (e.g., bad UUID)
//       status = 404;
//       code = ErrorCode.NOT_FOUND;
//       message = "Resource not found or invalid ID format";
//       break;
//     // Add more specific mappings as needed
//   }

//   return createErrorResponse(status, code, message, details);
// }

// // Validation schema for path parameter
// const refundIdParamSchema = z.object({
//   id: z.string().uuid("Invalid Refund ID format")
// });

// /**
//  * Get a refund by ID
//  */
// export const getRefund = async (req: Request, res: Response) => {
//   const context = 'getRefund';
//   try {
//     const merchantId = req.merchantId; // Provided by authenticateAPIKey middleware

//     // Check if merchantId is present (from auth middleware)
//     if (!merchantId) {
//       // This should technically not happen if auth middleware is working,
//       // but adding a safeguard.
//       return res.status(401).json(
//         createErrorResponse(
//           401,
//           ErrorCode.UNAUTHORIZED,
//           "Authentication failed: Merchant ID not found in request."
//         )
//       );
//     }

//     // Validate refundId from path parameters
//     const paramValidation = refundIdParamSchema.safeParse(req.params);
//     if (!paramValidation.success) {
//       return res.status(400).json(
//         createErrorResponse(
//           400,
//           ErrorCode.INVALID_REQUEST,
//           "Invalid Refund ID in URL",
//           paramValidation.error.format()
//         )
//       );
//     }
//     const { id: refundId } = paramValidation.data;

//     // Get refund using RPC function
//     const { data, error } = await supabase.rpc("get_refund", {
//       p_refund_id: refundId,
//       p_merchant_id: merchantId, // Pass merchantId for authorization check in DB
//     });

//     if (error) {
//       // Use the standardized handler for database errors
//       return res.status(500).json(handleDatabaseError(error, req, context));
//     }

//     // RPC function returns an array, check if it's empty
//     if (!data || data.length === 0) {
//       return res.status(404).json(
//         createErrorResponse(
//           404,
//           ErrorCode.NOT_FOUND,
//           "Refund not found or does not belong to this merchant"
//         )
//       );
//     }

//     // Return refund details (data is an array with one element)
//     const refund = data[0] as Types.Refund; // Cast to the expected type
//     res.status(200).json({
//       success: true,
//       data: refund, // Return the full refund object
//       environment: process.env.NODE_ENV === 'production' ? 'live' : 'test' // Add environment info
//     });
//   } catch (error: any) {
//     // Log unexpected errors
//     logError(error, context, req);
//     res.status(500).json(
//       createErrorResponse(
//         500,
//         ErrorCode.INTERNAL_ERROR,
//         "An unexpected internal server error occurred",
//         process.env.NODE_ENV === 'production' ? undefined : error.message // Show details only in non-prod
//       )
//     );
//   }
// };

// // /**
// //  * Update a refund status
// //  */
// // export const updateRefundStatus = async (req: Request, res: Response) => {
// //   try {
// //     const merchantId = req.merchantId;
// //     const refundId = req.params.id;

// //     if (!merchantId) {
// //       return res.status(401).json({
// //         error: {
// //           message: "Merchant ID not found",
// //         },
// //       });
// //     }

// //     // Validate request body
// //     const validationResult = updateRefundSchema.safeParse(req.body);

// //     if (!validationResult.success) {
// //       return res.status(400).json({
// //         error: {
// //           message: "Invalid request body",
// //           details: validationResult.error.format(),
// //         },
// //       });
// //     }

// //     const { status } = validationResult.data;

// //     // Update refund status using RPC function
// //     const { data: updated, error } = await supabase.rpc(
// //       "update_refund_status",
// //       {
// //         p_refund_id: refundId,
// //         p_merchant_id: merchantId,
// //         p_status: status,
// //       },
// //     );

// //     if (error) {
// //       console.error("Error updating refund status:", error);
// //       return res.status(500).json({
// //         error: {
// //           message: "Failed to update refund status",
// //           details: error.message,
// //         },
// //       });
// //     }

// //     if (!updated) {
// //       return res.status(404).json({
// //         error: {
// //           message: "Refund not found or does not belong to this merchant",
// //         },
// //       });
// //     }

// //     // Fetch the updated refund to return details
// //     const { data: refundData, error: getError } = await supabase.rpc(
// //       "get_refund",
// //       {
// //         p_refund_id: refundId,
// //         p_merchant_id: merchantId,
// //       },
// //     );

// //     if (getError || !refundData || refundData.length === 0) {
// //       return res.status(200).json({
// //         data: {
// //           refund_id: refundId,
// //           status: status,
// //           updated: true,
// //         },
// //       });
// //     }

// //     // Return updated refund details
// //     const refund = refundData[0];
// //     res.json({
// //       data: {
// //         refund_id: refund.refund_id,
// //         transaction_id: refund.transaction_id,
// //         amount: refund.amount,
// //         refunded_amount: refund.refunded_amount,
// //         fee_amount: refund.fee_amount,
// //         reason: refund.reason,
// //         status: refund.status,
// //         metadata: refund.metadata,
// //         created_at: refund.created_at,
// //         updated_at: refund.updated_at,
// //       },
// //     });
// //   } catch (error: any) {
// //     console.error("Error in updateRefundStatus:", error);
// //     res.status(500).json({
// //       error: {
// //         message: "Internal server error",
// //         details: error.message,
// //       },
// //     });
// //   }
// // };
