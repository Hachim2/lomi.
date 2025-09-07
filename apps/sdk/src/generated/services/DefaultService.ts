/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckoutSession } from '../models/CheckoutSession';
import type { ConnectedProvider } from '../models/ConnectedProvider';
import type { CreateCheckoutSession } from '../models/CreateCheckoutSession';
import type { CreateCustomer } from '../models/CreateCustomer';
import type { CreatePaymentLink } from '../models/CreatePaymentLink';
import type { CreateProduct } from '../models/CreateProduct';
import type { CreateRefund } from '../models/CreateRefund';
import type { CreateSubscriptionPlan } from '../models/CreateSubscriptionPlan';
import type { CreateWebhook } from '../models/CreateWebhook';
import type { CurrencyCode } from '../models/CurrencyCode';
import type { Customer } from '../models/Customer';
import type { Merchant } from '../models/Merchant';
import type { MerchantAccount } from '../models/MerchantAccount';
import type { PaymentLink } from '../models/PaymentLink';
import type { PaymentLinkType } from '../models/PaymentLinkType';
import type { Product } from '../models/Product';
import type { Provider } from '../models/Provider';
import type { ProviderCode } from '../models/ProviderCode';
import type { Refund } from '../models/Refund';
import type { Subscription } from '../models/Subscription';
import type { SubscriptionPlan } from '../models/SubscriptionPlan';
import type { Transaction } from '../models/Transaction';
import type { Webhook } from '../models/Webhook';
import type { WebhookEvent } from '../models/WebhookEvent';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Ping the API
     * @returns any Successful response
     * @throws ApiError
     */
    public static getPing(): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ping',
        });
    }
    /**
     * Get merchant details
     * @returns Merchant OK
     * @throws ApiError
     */
    public static getMerchants({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<Merchant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}',
            path: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List connected payment providers for a merchant
     * @returns ConnectedProvider OK
     * @throws ApiError
     */
    public static merchantProviders({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<Array<ConnectedProvider>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/providers',
            path: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a new product
     * @returns Product Created
     * @throws ApiError
     */
    public static postProducts({
        requestBody,
    }: {
        requestBody?: CreateProduct,
    }): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/products',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * List products for a merchant
     * @returns Product OK
     * @throws ApiError
     */
    public static getProducts({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<Array<Product>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/products',
            query: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get product details
     * Get details of a specific product
     * @returns Product Product details retrieved successfully
     * @throws ApiError
     */
    public static getProduct({
        productId,
    }: {
        productId: string,
    }): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update product status
     * Update only the active status of a product. Core details (name, price, etc.) cannot be changed after creation.
     * @returns any Product status updated successfully
     * @throws ApiError
     */
    public static updateProductStatus({
        productId,
        requestBody,
    }: {
        productId: string,
        requestBody: {
            is_active: boolean;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Delete product
     * Delete a product
     * @returns void
     * @throws ApiError
     */
    public static deleteProduct({
        productId,
    }: {
        productId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a subscription plan
     * @returns SubscriptionPlan Created
     * @throws ApiError
     */
    public static postSubscriptions({
        requestBody,
    }: {
        requestBody?: CreateSubscriptionPlan,
    }): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/subscriptions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * List subscription plans for a merchant
     * @returns SubscriptionPlan OK
     * @throws ApiError
     */
    public static getSubscriptions({
        merchantId,
        limit = 20,
        offset,
    }: {
        /**
         * The ID of the merchant whose plans to list.
         */
        merchantId: string,
        /**
         * Maximum number of items to return.
         */
        limit?: number,
        /**
         * Number of items to skip before starting to collect the result set.
         */
        offset?: number,
    }): CancelablePromise<Array<SubscriptionPlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/subscriptions',
            query: {
                'merchant_id': merchantId,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a subscription plan for a merchant
     * @returns SubscriptionPlan Created
     * @throws ApiError
     */
    public static postMerchantsSubscriptions({
        merchantId,
        requestBody,
    }: {
        /**
         * The ID of the merchant for whom to create the plan.
         */
        merchantId: string,
        requestBody?: CreateSubscriptionPlan,
    }): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/merchants/{merchant_id}/subscriptions',
            path: {
                'merchant_id': merchantId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * List subscription plans for a merchant
     * @returns SubscriptionPlan OK
     * @throws ApiError
     */
    public static getMerchantsSubscriptions({
        merchantId,
        limit,
        offset,
    }: {
        /**
         * The ID of the merchant whose plans to list.
         */
        merchantId: string,
        limit?: any,
        offset?: any,
    }): CancelablePromise<Array<SubscriptionPlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/subscriptions',
            path: {
                'merchant_id': merchantId,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get subscription plan details for a merchant
     * Get details of a specific subscription plan belonging to a merchant
     * @returns SubscriptionPlan Subscription plan details retrieved successfully
     * @throws ApiError
     */
    public static getSubscriptionPlan({
        merchantId,
        planId,
    }: {
        /**
         * The ID of the merchant.
         */
        merchantId: string,
        /**
         * The ID of the subscription plan.
         */
        planId: string,
    }): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/subscriptions/{plan_id}',
            path: {
                'merchant_id': merchantId,
                'plan_id': planId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update subscription plan
     * Update specific fields (is_active, metadata) of a subscription plan. Core details are immutable via API.
     * @returns SubscriptionPlan Subscription plan updated successfully
     * @throws ApiError
     */
    public static updateSubscriptionPlan({
        merchantId,
        planId,
        requestBody,
    }: {
        /**
         * The ID of the merchant.
         */
        merchantId: string,
        /**
         * The ID of the subscription plan.
         */
        planId: string,
        requestBody: {
            is_active?: boolean;
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/merchants/{merchant_id}/subscriptions/{plan_id}',
            path: {
                'merchant_id': merchantId,
                'plan_id': planId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Delete subscription plan
     * Delete a subscription plan belonging to a merchant
     * @returns void
     * @throws ApiError
     */
    public static deleteSubscriptionPlan({
        merchantId,
        planId,
    }: {
        /**
         * The ID of the merchant.
         */
        merchantId: string,
        /**
         * The ID of the subscription plan.
         */
        planId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/merchants/{merchant_id}/subscriptions/{plan_id}',
            path: {
                'merchant_id': merchantId,
                'plan_id': planId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List transactions for a merchant
     * @returns Transaction OK
     * @throws ApiError
     */
    public static transactionsList({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<Array<Transaction>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/transactions',
            query: {
                'merchant_id': merchantId,
            },
        });
    }
    /**
     * List available payment providers
     * @returns Provider OK
     * @throws ApiError
     */
    public static providers(): CancelablePromise<Array<Provider>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/providers',
            errors: {
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * Create a refund
     * Initiate a refund for a transaction
     * @returns Refund Refund created successfully
     * @throws ApiError
     */
    public static createRefund({
        requestBody,
    }: {
        requestBody: CreateRefund,
    }): CancelablePromise<Refund> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/refunds',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get refund details
     * Get details of a specific refund
     * @returns Refund Refund details retrieved successfully
     * @throws ApiError
     */
    public static getRefund({
        refundId,
    }: {
        refundId: string,
    }): CancelablePromise<Refund> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/refunds/{refund_id}',
            path: {
                'refund_id': refundId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update refund status
     * Update the status of a refund
     * @returns Refund Refund updated successfully
     * @throws ApiError
     */
    public static updateRefund({
        refundId,
        requestBody,
    }: {
        refundId: string,
        requestBody: {
            status: 'completed' | 'failed';
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<Refund> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/refunds/{refund_id}',
            path: {
                'refund_id': refundId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a customer
     * Create a new customer for a merchant
     * @returns Customer Customer created successfully
     * @throws ApiError
     */
    public static createCustomer({
        requestBody,
    }: {
        requestBody: CreateCustomer,
    }): CancelablePromise<Customer> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/customers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * List customers
     * List all customers for a merchant
     * @returns Customer List of customers
     * @throws ApiError
     */
    public static listCustomers({
        merchantId,
        email,
        phoneNumber,
    }: {
        merchantId: string,
        email?: string,
        phoneNumber?: string,
    }): CancelablePromise<Array<Customer>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/customers',
            query: {
                'merchant_id': merchantId,
                'email': email,
                'phone_number': phoneNumber,
            },
            errors: {
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * Get customer details
     * Get details of a specific customer
     * @returns Customer Customer details retrieved successfully
     * @throws ApiError
     */
    public static getCustomer({
        customerId,
    }: {
        customerId: string,
    }): CancelablePromise<Customer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/customers/{customer_id}',
            path: {
                'customer_id': customerId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update customer
     * Update customer details
     * @returns Customer Customer updated successfully
     * @throws ApiError
     */
    public static updateCustomer({
        customerId,
        requestBody,
    }: {
        customerId: string,
        requestBody: {
            email?: string;
            phone_number?: string;
            first_name?: string;
            last_name?: string;
            address?: {
                street?: string;
                city?: string;
                state?: string;
                postal_code?: string;
                country?: string;
            };
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<Customer> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/customers/{customer_id}',
            path: {
                'customer_id': customerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Delete customer
     * Delete a customer
     * @returns void
     * @throws ApiError
     */
    public static deleteCustomer({
        customerId,
    }: {
        customerId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/customers/{customer_id}',
            path: {
                'customer_id': customerId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a payment link
     * Create a new payment link for collecting payments
     * @returns PaymentLink Payment link created successfully
     * @throws ApiError
     */
    public static createPaymentLink({
        requestBody,
    }: {
        requestBody: CreatePaymentLink,
    }): CancelablePromise<PaymentLink> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/payment-links',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List payment links
     * List all payment links for a merchant
     * @returns PaymentLink List of payment links
     * @throws ApiError
     */
    public static listPaymentLinks({
        merchantId,
        linkType,
        currencyCode,
        isActive,
    }: {
        merchantId: string,
        linkType?: PaymentLinkType,
        currencyCode?: CurrencyCode,
        isActive?: boolean,
    }): CancelablePromise<Array<PaymentLink>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/payment-links',
            query: {
                'merchant_id': merchantId,
                'link_type': linkType,
                'currency_code': currencyCode,
                'is_active': isActive,
            },
            errors: {
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * Get payment link details
     * Get details of a specific payment link
     * @returns PaymentLink Payment link details retrieved successfully
     * @throws ApiError
     */
    public static getPaymentLink({
        linkId,
    }: {
        linkId: string,
    }): CancelablePromise<PaymentLink> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/payment-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update payment link
     * Update configurable details of a payment link.
     * **Important:** Core link details (title, description, price/product/plan, currency, quantity settings) are fixed after creation and cannot be changed via the API. To modify these, create a new link.
     *
     * @returns PaymentLink Payment link updated successfully
     * @throws ApiError
     */
    public static updatePaymentLink({
        linkId,
        requestBody,
    }: {
        linkId: string,
        requestBody: {
            /**
             * Set to null to remove expiration
             */
            expires_at?: string | null;
            success_url?: string;
            cancel_url?: string;
            /**
             * Update the list of allowed payment providers
             */
            allowed_providers?: Array<ProviderCode>;
            /**
             * Enable or disable coupon code usage for this link
             */
            allow_coupon_code?: boolean;
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<PaymentLink> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/payment-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Delete payment link
     * Delete a payment link
     * @returns void
     * @throws ApiError
     */
    public static deletePaymentLink({
        linkId,
    }: {
        linkId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/payment-links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Register a new webhook endpoint
     * Create a new webhook endpoint for receiving event notifications
     * @returns Webhook Webhook endpoint created successfully
     * @throws ApiError
     */
    public static createWebhook({
        requestBody,
    }: {
        requestBody: CreateWebhook,
    }): CancelablePromise<Webhook> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * List webhook endpoints
     * List all webhook endpoints for a merchant
     * @returns Webhook List of webhook endpoints
     * @throws ApiError
     */
    public static listWebhooks({
        merchantId,
        organizationId,
        isActive,
    }: {
        merchantId: string,
        organizationId?: string,
        isActive?: boolean,
    }): CancelablePromise<Array<Webhook>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/webhooks',
            query: {
                'merchant_id': merchantId,
                'organization_id': organizationId,
                'is_active': isActive,
            },
            errors: {
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * Get webhook details
     * Get details of a specific webhook endpoint
     * @returns Webhook Webhook details retrieved successfully
     * @throws ApiError
     */
    public static getWebhook({
        webhookId,
    }: {
        webhookId: string,
    }): CancelablePromise<Webhook> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update webhook configuration
     * Update webhook endpoint configuration
     * @returns Webhook Webhook configuration updated successfully
     * @throws ApiError
     */
    public static updateWebhook({
        webhookId,
        requestBody,
    }: {
        webhookId: string,
        requestBody: {
            organization_id?: string;
            url?: string;
            authorized_events?: Array<WebhookEvent>;
            is_active?: boolean;
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<Webhook> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Delete webhook endpoint
     * Delete a webhook endpoint
     * @returns void
     * @throws ApiError
     */
    public static deleteWebhook({
        webhookId,
    }: {
        webhookId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Create a checkout session
     * Create a new checkout session for collecting payments
     * @returns CheckoutSession Checkout session created successfully
     * @throws ApiError
     */
    public static createCheckoutSession({
        requestBody,
    }: {
        requestBody: CreateCheckoutSession,
    }): CancelablePromise<CheckoutSession> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/checkout-sessions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List checkout sessions
     * List all checkout sessions for a merchant
     * @returns CheckoutSession List of checkout sessions
     * @throws ApiError
     */
    public static listCheckoutSessions({
        merchantId,
        checkoutSessionId,
        status,
    }: {
        merchantId: string,
        checkoutSessionId?: string,
        status?: 'open' | 'completed' | 'expired',
    }): CancelablePromise<Array<CheckoutSession>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/checkout-sessions',
            query: {
                'merchant_id': merchantId,
                'checkout_session_id': checkoutSessionId,
                'status': status,
            },
            errors: {
                401: `API key is missing or invalid`,
            },
        });
    }
    /**
     * Get a checkout session by ID
     * Get details of a specific checkout session
     * @returns CheckoutSession Checkout session details retrieved successfully
     * @throws ApiError
     */
    public static getCheckoutSession({
        sessionId,
    }: {
        sessionId: string,
    }): CancelablePromise<CheckoutSession> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/checkout-sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get transaction details
     * Get details of a specific transaction by its ID
     * @returns Transaction Transaction details retrieved successfully
     * @throws ApiError
     */
    public static getTransactionById({
        transactionId,
    }: {
        transactionId: string,
    }): CancelablePromise<Transaction> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/transactions/{transaction_id}',
            path: {
                'transaction_id': transactionId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get merchant monthly recurring revenue
     * Retrieve current monthly recurring revenue
     * @returns any Monthly recurring revenue retrieved successfully
     * @throws ApiError
     */
    public static getMerchantMrr({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<{
        merchant_id?: string;
        /**
         * Monthly Recurring Revenue
         */
        mrr?: number;
        created_at?: string;
        updated_at?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/mrr',
            path: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get merchant annual recurring revenue
     * Retrieve current annual recurring revenue
     * @returns any Annual recurring revenue retrieved successfully
     * @throws ApiError
     */
    public static getMerchantArr({
        merchantId,
    }: {
        merchantId: string,
    }): CancelablePromise<{
        merchant_id?: string;
        /**
         * Annual Recurring Revenue
         */
        arr?: number;
        created_at?: string;
        updated_at?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/arr',
            path: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get merchant account balance
     * Retrieve current account balance for a merchant
     * @returns any Account balance retrieved successfully
     * @throws ApiError
     */
    public static getMerchantBalance({
        merchantId,
        currencyCode,
    }: {
        merchantId: string,
        /**
         * Filter balance by currency
         */
        currencyCode?: CurrencyCode,
    }): CancelablePromise<Array<{
        merchant_id?: string;
        currency_code?: CurrencyCode;
        balance?: number;
        created_at?: string;
        updated_at?: string;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/balance',
            path: {
                'merchant_id': merchantId,
            },
            query: {
                'currency_code': currencyCode,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List merchant accounts
     * Retrieve all accounts belonging to a merchant with their balances
     * @returns MerchantAccount List of merchant accounts retrieved successfully
     * @throws ApiError
     */
    public static listMerchantAccounts({
        merchantId,
        currencyCode,
    }: {
        merchantId: string,
        /**
         * Filter accounts by currency
         */
        currencyCode?: CurrencyCode,
    }): CancelablePromise<Array<MerchantAccount>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/accounts',
            path: {
                'merchant_id': merchantId,
            },
            query: {
                'currency_code': currencyCode,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get transaction summary for a merchant
     * Retrieve summary of transactions including total counts and amounts by status
     * @returns any Transaction summary retrieved successfully
     * @throws ApiError
     */
    public static getMerchantTransactionsSummary({
        merchantId,
        startDate,
        endDate,
        currencyCode,
    }: {
        merchantId: string,
        /**
         * Start date for filtering transactions
         */
        startDate?: string,
        /**
         * End date for filtering transactions
         */
        endDate?: string,
        /**
         * Filter transactions by currency
         */
        currencyCode?: CurrencyCode,
    }): CancelablePromise<{
        total_count?: number;
        total_gross_amount?: number;
        total_fee_amount?: number;
        total_net_amount?: number;
        by_status?: {
            pending?: number;
            completed?: number;
            failed?: number;
            refunded?: number;
            expired?: number;
        };
        by_payment_method?: Record<string, number>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/merchants/{merchant_id}/transactions/summary',
            path: {
                'merchant_id': merchantId,
            },
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'currency_code': currencyCode,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * List customer subscriptions
     * List all subscriptions for a merchant
     * @returns Subscription List of subscriptions
     * @throws ApiError
     */
    public static listCustomerSubscriptions({
        merchantId,
        customerId,
        status,
    }: {
        merchantId: string,
        customerId?: string,
        status?: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired' | 'past_due' | 'trial',
    }): CancelablePromise<Array<Subscription>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/customer-subscriptions',
            query: {
                'merchant_id': merchantId,
                'customer_id': customerId,
                'status': status,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Get subscription details
     * Get details of a specific subscription
     * @returns Subscription Subscription details retrieved successfully
     * @throws ApiError
     */
    public static getSubscription({
        subscriptionId,
        merchantId,
    }: {
        subscriptionId: string,
        /**
         * The ID of the merchant owning the subscription.
         */
        merchantId: string,
    }): CancelablePromise<Subscription> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/customer-subscriptions/{subscription_id}',
            path: {
                'subscription_id': subscriptionId,
            },
            query: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Update subscription
     * Update subscription details
     * @returns Subscription Subscription updated successfully
     * @throws ApiError
     */
    public static updateSubscription({
        subscriptionId,
        merchantId,
        requestBody,
    }: {
        subscriptionId: string,
        /**
         * The ID of the merchant owning the subscription.
         */
        merchantId: string,
        requestBody?: {
            status?: 'active' | 'paused' | 'cancelled';
            end_date?: string;
            next_billing_date?: string;
            metadata?: Record<string, any>;
        },
    }): CancelablePromise<Subscription> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/customer-subscriptions/{subscription_id}',
            path: {
                'subscription_id': subscriptionId,
            },
            query: {
                'merchant_id': merchantId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request parameters`,
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Cancel subscription
     * Cancel a subscription
     * @returns void
     * @throws ApiError
     */
    public static cancelSubscription({
        subscriptionId,
        merchantId,
    }: {
        subscriptionId: string,
        /**
         * The ID of the merchant owning the subscription.
         */
        merchantId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/customer-subscriptions/{subscription_id}',
            path: {
                'subscription_id': subscriptionId,
            },
            query: {
                'merchant_id': merchantId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Regenerate webhook secret
     * Generate a new verification token for a webhook endpoint
     * @returns any Webhook secret regenerated successfully
     * @throws ApiError
     */
    public static regenerateWebhookSecret({
        webhookId,
    }: {
        webhookId: string,
    }): CancelablePromise<{
        webhook_id?: string;
        /**
         * New secret token used to verify webhook signatures. Format: whsec_*
         */
        verification_token?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks/{webhook_id}/regenerate-secret',
            path: {
                'webhook_id': webhookId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
    /**
     * Send test webhook
     * Send a test event to a webhook endpoint to verify it's working correctly
     * @returns any Test webhook sent successfully
     * @throws ApiError
     */
    public static testWebhook({
        webhookId,
    }: {
        webhookId: string,
    }): CancelablePromise<{
        webhook_id?: string;
        success?: boolean;
        status_code?: number;
        response_body?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks/{webhook_id}/test',
            path: {
                'webhook_id': webhookId,
            },
            errors: {
                401: `API key is missing or invalid`,
                404: `The requested resource was not found`,
            },
        });
    }
}
