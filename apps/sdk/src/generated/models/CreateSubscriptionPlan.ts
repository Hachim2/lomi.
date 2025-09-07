/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BillingFrequency } from './BillingFrequency';
import type { CurrencyCode } from './CurrencyCode';
import type { FailedPaymentAction } from './FailedPaymentAction';
import type { FirstPaymentType } from './FirstPaymentType';
export type CreateSubscriptionPlan = {
    name: string;
    description?: string;
    amount: number;
    currency_code: CurrencyCode;
    billing_frequency: BillingFrequency;
    failed_payment_action?: FailedPaymentAction;
    charge_day?: number;
    metadata?: Record<string, any>;
    is_active?: boolean;
    first_payment_type?: FirstPaymentType;
};

