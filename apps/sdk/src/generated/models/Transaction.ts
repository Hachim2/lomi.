/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateTransaction } from './CreateTransaction';
import type { TransactionStatus } from './TransactionStatus';
export type Transaction = (CreateTransaction & {
    transaction_id?: string;
    status?: TransactionStatus;
    quantity?: number;
    created_at?: string;
    updated_at?: string;
});

