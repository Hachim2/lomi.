import { describe, expect, it } from '@jest/globals';
import { LomiSDK } from '../../src';
import {
  MerchantsClient,
  ProductsClient,
  SubscriptionsClient,
  TransactionsClient,
  CheckoutSessionsClient,
  ProvidersClient,
  PingClient,
  WebhooksClient,
  CustomersClient,
  RefundsClient,
  PaymentLinksClient
} from '../../src/client';

describe('LomiSDK', () => {
  const baseUrl = 'https://api.example.com';
  const apiKey = 'test-api-key';
  
  describe('constructor', () => {
    it('should initialize with baseUrl and apiKey', () => {
      const sdk = new LomiSDK({ baseUrl, apiKey });
      
      expect(sdk).toBeInstanceOf(LomiSDK);
      expect(sdk.merchants).toBeInstanceOf(MerchantsClient);
      expect(sdk.products).toBeInstanceOf(ProductsClient);
      expect(sdk.subscriptions).toBeInstanceOf(SubscriptionsClient);
      expect(sdk.transactions).toBeInstanceOf(TransactionsClient);
      expect(sdk.checkoutSessions).toBeInstanceOf(CheckoutSessionsClient);
      expect(sdk.providers).toBeInstanceOf(ProvidersClient);
      expect(sdk.ping).toBeInstanceOf(PingClient);
      expect(sdk.webhooks).toBeInstanceOf(WebhooksClient);
      expect(sdk.customers).toBeInstanceOf(CustomersClient);
      expect(sdk.refunds).toBeInstanceOf(RefundsClient);
      expect(sdk.paymentLinks).toBeInstanceOf(PaymentLinksClient);
    });
    
    it('should initialize with only baseUrl', () => {
      const sdk = new LomiSDK({ baseUrl });
      
      expect(sdk).toBeInstanceOf(LomiSDK);
      expect(sdk.merchants).toBeInstanceOf(MerchantsClient);
      // Test one client to ensure it works without API key
      expect(sdk.ping).toBeInstanceOf(PingClient);
    });
  });
  
  describe('static init', () => {
    it('should initialize SDK with static method', () => {
      const sdk = LomiSDK.init({ baseUrl, apiKey });
      
      expect(sdk).toBeInstanceOf(LomiSDK);
      expect(sdk.merchants).toBeInstanceOf(MerchantsClient);
      expect(sdk.products).toBeInstanceOf(ProductsClient);
      expect(sdk.subscriptions).toBeInstanceOf(SubscriptionsClient);
      expect(sdk.transactions).toBeInstanceOf(TransactionsClient);
      expect(sdk.checkoutSessions).toBeInstanceOf(CheckoutSessionsClient);
      expect(sdk.providers).toBeInstanceOf(ProvidersClient);
      expect(sdk.ping).toBeInstanceOf(PingClient);
      expect(sdk.webhooks).toBeInstanceOf(WebhooksClient);
      expect(sdk.customers).toBeInstanceOf(CustomersClient);
      expect(sdk.refunds).toBeInstanceOf(RefundsClient);
      expect(sdk.paymentLinks).toBeInstanceOf(PaymentLinksClient);
    });
    
    it('should initialize with only baseUrl using static method', () => {
      const sdk = LomiSDK.init({ baseUrl });
      
      expect(sdk).toBeInstanceOf(LomiSDK);
      expect(sdk.merchants).toBeInstanceOf(MerchantsClient);
      // Test one client to ensure it works without API key
      expect(sdk.ping).toBeInstanceOf(PingClient);
    });
  });
}); 