/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentMethodCode } from './PaymentMethodCode';
import type { ProviderCode } from './ProviderCode';
export type Provider = {
    code?: ProviderCode;
    name?: string;
    description?: string;
    payment_methods?: Array<PaymentMethodCode>;
    is_connected?: boolean;
};

