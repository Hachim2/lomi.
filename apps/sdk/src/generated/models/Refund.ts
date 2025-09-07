/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RefundStatus } from './RefundStatus';
export type Refund = {
    refund_id: string;
    transaction_id: string;
    amount: number;
    refunded_amount: number;
    fee_amount: number;
    status: RefundStatus;
    reason?: string;
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
};

