/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WebhookEvent } from './WebhookEvent';
export type CreateWebhook = {
    merchant_id: string;
    organization_id: string;
    url: string;
    authorized_events: Array<WebhookEvent>;
    is_active?: boolean;
    metadata?: Record<string, any>;
};

