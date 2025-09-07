import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { LomiSDK } from '../../src';
import * as Types from '../../src/types/api';
import { ApiError } from '../../src/client/core/ApiError';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Client Methods', () => {
  const sdk = new LomiSDK({
    baseUrl: 'https://sandbox.api.lomi.africa/v1',
    apiKey: 'lomi_sk_test_123'
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('BaseClient Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.ping.list()).rejects.toThrow('Network error');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          code: 'INVALID_REQUEST',
          message: 'Invalid request'
        })
      } as Response);

      await expect(sdk.ping.list()).rejects.toThrow(ApiError);
    });

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined)
      } as Response);

      const result = await sdk.ping.list();
      expect(result.data).toBeUndefined();
    });
  });

  describe('ProductsClient', () => {
    it('should create a product', async () => {
      const mockProduct: Types.CreateProduct = {
        name: 'Test Product',
        description: 'A test product',
        price: 1000,
        currency_code: Types.CurrencyCode.XOF,
        is_active: true,
        display_on_storefront: true,
        metadata: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          ...mockProduct,
          product_id: 'prod_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } as Response);

      const result = await sdk.products.create(mockProduct);
      expect(result.data.product_id).toBe('prod_123');
    });

    it('should get a product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          product_id: 'prod_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          name: 'Test Product',
          description: 'A test product',
          price: 1000,
          currency_code: Types.CurrencyCode.XOF,
          is_active: true,
          display_on_storefront: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } as Response);

      const result = await sdk.products.getProduct('prod_123');
      expect(result.data.product_id).toBe('prod_123');
    });

    it('should list products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          product_id: 'prod_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          name: 'Test Product',
          description: 'A test product',
          price: 1000,
          currency_code: Types.CurrencyCode.XOF,
          is_active: true,
          display_on_storefront: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      } as Response);

      const result = await sdk.products.list('merchant_123');
      expect(result.data).toHaveLength(1);
    });

    it('should delete a product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined)
      } as Response);

      const result = await sdk.products.deleteProduct('prod_123');
      expect(result.status).toBe(204);
    });
  });

  describe('SubscriptionsClient', () => {
    it('should create a subscription plan', async () => {
      const mockPlan: Types.CreateSubscriptionPlan = {
        name: 'Test Plan',
        description: 'A test subscription plan',
        amount: 1000,
        currency_code: Types.CurrencyCode.XOF,
        billing_frequency: Types.BillingFrequency.monthly,
        failed_payment_action: Types.FailedPaymentAction.pause,
        charge_day: 1,
        metadata: {},
        display_on_storefront: true,
        first_payment_type: Types.FirstPaymentType.initial
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          ...mockPlan,
          plan_id: 'plan_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } as Response);

      const result = await sdk.subscriptions.create(mockPlan);
      expect(result.data.plan_id).toBe('plan_123');
    });

    it('should list subscription plans', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          plan_id: 'plan_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          name: 'Test Plan',
          description: 'A test subscription plan',
          amount: 1000,
          currency_code: Types.CurrencyCode.XOF,
          billing_frequency: Types.BillingFrequency.monthly,
          failed_payment_action: Types.FailedPaymentAction.pause,
          charge_day: 1,
          metadata: {},
          display_on_storefront: true,
          first_payment_type: Types.FirstPaymentType.initial,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      } as Response);

      const result = await sdk.subscriptions.list('merchant_123');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('TransactionsClient', () => {
    it('should list transactions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          transaction_id: 'txn_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          customer_id: 'cust_123',
          transaction_type: Types.TransactionType.payment,
          description: 'Test transaction',
          reference_id: 'ref_123',
          metadata: {},
          gross_amount: 1000,
          fee_amount: 50,
          net_amount: 950,
          fee_reference: 'XOF/WAVE Mobile Money Fee',
          currency_code: Types.CurrencyCode.XOF,
          provider_code: Types.ProviderCode.WAVE,
          payment_method_code: Types.PaymentMethodCode.E_WALLET,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      } as Response);

      const result = await sdk.transactions.transactionsList('merchant_123');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].transaction_id).toBe('txn_123');
    });

    it('should get a transaction by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          transaction_id: 'txn_123',
          merchant_id: 'merchant_123',
          organization_id: 'org_123',
          customer_id: 'cust_123',
          transaction_type: Types.TransactionType.payment,
          description: 'Test transaction',
          reference_id: 'ref_123',
          metadata: {},
          gross_amount: 1000,
          fee_amount: 50,
          net_amount: 950,
          fee_reference: 'XOF/WAVE Mobile Money Fee',
          currency_code: Types.CurrencyCode.XOF,
          provider_code: Types.ProviderCode.WAVE,
          payment_method_code: Types.PaymentMethodCode.E_WALLET,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } as Response);

      const result = await sdk.transactions.getTransactionById('txn_123');
      expect(result.data.transaction_id).toBe('txn_123');
    });
  });

  describe('CheckoutSessionsClient', () => {
    it('should create a checkout session', async () => {
      const mockSession: Types.CreateCheckoutSession = {
        merchant_id: 'merchant_123',
        organization_id: 'org_123',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        provider_codes: [Types.ProviderCode.WAVE],
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        metadata: {},
        amount: 1000,
        currency_code: Types.CurrencyCode.XOF,
        allowed_providers: [Types.ProviderCode.WAVE]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          ...mockSession,
          checkout_session_id: 'cs_123',
          url: 'https://checkout.lomi.africa/cs_123',
          status: 'open',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        })
      } as Response);

      const result = await sdk.checkoutSessions.createCheckoutSession(mockSession);
      expect(result.data.checkout_session_id).toBe('cs_123');
    });

    it('should list checkout sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          checkout_session_id: 'cs_123',
          merchant_id: 'merchant_123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
          provider_codes: [Types.ProviderCode.WAVE],
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
          metadata: {},
          url: 'https://checkout.lomi.africa/cs_123',
          status: 'completed',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }])
      } as Response);

      const result = await sdk.checkoutSessions.listCheckoutSessions('merchant_123');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].checkout_session_id).toBe('cs_123');
    });

    it('should get a checkout session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          checkout_session_id: 'cs_123',
          merchant_id: 'merchant_123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
          provider_codes: [Types.ProviderCode.WAVE],
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
          metadata: {},
          url: 'https://checkout.lomi.africa/cs_123',
          status: 'completed',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        })
      } as Response);

      const result = await sdk.checkoutSessions.getCheckoutSession('cs_123');
      expect(result.data.checkout_session_id).toBe('cs_123');
    });
  });

  describe('MerchantsClient', () => {
    it('should get merchant details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          merchant_id: 'merchant_123',
          name: 'Test Merchant',
          email: 'merchant@example.com',
          phone_number: '+1234567890',
          onboarded: true,
          country: 'SN',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } as Response);

      const result = await sdk.merchants.get('merchant_123');
      expect(result.data.merchant_id).toBe('merchant_123');
    });

    it('should list merchant providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          provider_code: Types.ProviderCode.WAVE,
          is_connected: true,
          phone_number: '+1234567890',
          is_phone_verified: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      } as Response);

      const result = await sdk.merchants.merchantProviders('merchant_123');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('ProvidersClient', () => {
    it('should list available providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{
          code: Types.ProviderCode.WAVE,
          name: 'Wave',
          description: 'Wave Mobile Money',
          logo_url: 'https://example.com/wave.png',
          payment_methods: [{
            code: Types.PaymentMethodCode.E_WALLET,
            name: 'E-Wallet',
            description: 'Mobile Money Wallet'
          }]
        }])
      } as Response);

      const result = await sdk.providers.providers();
      expect(result.data[0].code).toBe(Types.ProviderCode.WAVE);
    });
  });

  describe('PingClient', () => {
    it('should ping the API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'pong' })
      } as Response);

      const result = await sdk.ping.list();
      expect(result.data.message).toBe('pong');
    });
  });
}); 