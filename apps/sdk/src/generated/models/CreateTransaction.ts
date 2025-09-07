/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
import type { PaymentMethodCode } from './PaymentMethodCode';
import type { ProviderCode } from './ProviderCode';
import type { TransactionType } from './TransactionType';
export type CreateTransaction = {
    merchant_id: string;
    organization_id: string;
    customer_id: string;
    product_id?: string;
    subscription_id?: string;
    transaction_type: TransactionType;
    description?: string;
    quantity?: number;
    metadata?: Record<string, any>;
    gross_amount: number;
    fee_amount: number;
    net_amount: number;
    fee_reference: string;
    currency_code: CurrencyCode;
    provider_code: ProviderCode;
    payment_method_code: PaymentMethodCode;
};

