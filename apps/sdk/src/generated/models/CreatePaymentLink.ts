/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
import type { PaymentLinkType } from './PaymentLinkType';
import type { ProviderCode } from './ProviderCode';
export type CreatePaymentLink = {
    /**
     * ID of the merchant creating the link. Note: This is typically inferred from the API key via authentication middleware and does not need to be provided in the request body.
     */
    merchant_id?: string;
    organization_id?: string;
    link_type: PaymentLinkType;
    product_id?: string;
    plan_id?: string;
    title: string;
    public_description?: string;
    price?: number;
    currency_code: CurrencyCode;
    /**
     * Array of payment providers allowed for this payment link
     */
    allowed_providers?: Array<ProviderCode>;
    allow_coupon_code?: boolean;
    allow_quantity?: boolean;
    quantity?: number;
    is_active?: boolean;
    expires_at?: string;
    success_url?: string;
    cancel_url?: string;
    metadata?: Record<string, any>;
};

