/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProviderBusinessType } from './ProviderBusinessType';
import type { ProviderCode } from './ProviderCode';
export type ConnectedProvider = {
    provider_code?: ProviderCode;
    name?: string;
    description?: string;
    is_connected?: boolean;
    provider_merchant_id?: string;
    provider_business_type?: ProviderBusinessType;
    phone_number?: string;
    is_phone_verified?: boolean;
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
};

