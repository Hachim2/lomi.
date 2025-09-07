/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
export type MerchantAccount = {
    account_id: string;
    merchant_id?: string;
    organization_id: string;
    balance: number;
    currency_code: CurrencyCode;
    created_at?: string;
    updated_at?: string;
};

