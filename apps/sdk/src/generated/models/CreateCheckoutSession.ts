/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
import type { ProviderCode } from './ProviderCode';
export type CreateCheckoutSession = {
    merchant_id: string;
    organization_id: string;
    /**
     * Title for the checkout session
     */
    title?: string;
    /**
     * Public description for the checkout session
     */
    public_description?: string;
    product_id?: string;
    subscription_id?: string;
    plan_id?: string;
    amount: number;
    currency_code: CurrencyCode;
    success_url: string;
    cancel_url: string;
    /**
     * Specific payment providers to enable for this checkout session
     */
    allowed_providers: Array<ProviderCode>;
    customer_id?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_name?: string;
    /**
     * Whether a coupon code is allowed for this checkout session
     */
    allow_coupon_code?: boolean;
    allow_quantity?: boolean;
    quantity?: number;
    metadata?: Record<string, any>;
};

