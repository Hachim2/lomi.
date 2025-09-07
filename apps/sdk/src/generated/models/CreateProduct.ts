/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrencyCode } from './CurrencyCode';
export type CreateProduct = {
    name: string;
    description?: string;
    price: number;
    currency_code: CurrencyCode;
    is_active?: boolean;
};

