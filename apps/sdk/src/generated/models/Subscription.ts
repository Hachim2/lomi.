/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SubscriptionStatus } from './SubscriptionStatus';
export type Subscription = {
    subscription_id: string;
    merchant_id: string;
    organization_id: string;
    plan_id: string;
    customer_id: string;
    status: SubscriptionStatus;
    start_date: string;
    end_date?: string;
    next_billing_date?: string;
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
};

