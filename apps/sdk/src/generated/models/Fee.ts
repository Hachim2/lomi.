/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
import type { FeeType } from './FeeType';
import type { PaymentMethodCode } from './PaymentMethodCode';
import type { ProviderCode } from './ProviderCode';
import type { TransactionType } from './TransactionType';
export type Fee = {
    fee_id: string;
    name: string;
    transaction_type: TransactionType;
    fee_type: FeeType;
    percentage: number;
    fixed_amount: number;
    currency_code: CurrencyCode;
    payment_method_code?: PaymentMethodCode;
    provider_code?: ProviderCode;
    created_at?: string;
    updated_at?: string;
};

