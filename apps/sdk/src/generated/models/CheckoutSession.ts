/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckoutSessionStatus } from './CheckoutSessionStatus';
import type { CreateCheckoutSession } from './CreateCheckoutSession';
export type CheckoutSession = (CreateCheckoutSession & {
    checkout_session_id?: string;
    payment_link_id?: string;
    url?: string;
    allow_quantity?: boolean;
    quantity?: number;
    status?: CheckoutSessionStatus;
    created_at?: string;
    updated_at?: string;
    expires_at?: string;
});

