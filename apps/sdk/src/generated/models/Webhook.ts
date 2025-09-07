/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateWebhook } from './CreateWebhook';
export type Webhook = (CreateWebhook & {
    webhook_id?: string;
    /**
     * Secret token used to verify webhook signatures. Format: whsec_*
     */
    verification_token?: string;
    last_triggered_at?: string;
    last_payload?: Record<string, any>;
    last_response_status?: number;
    last_response_body?: string;
    retry_count?: number;
    created_at?: string;
    updated_at?: string;
});

