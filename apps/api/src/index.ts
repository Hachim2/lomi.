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
  PaymentLinksClient,
} from "./client";

export * from "./types/api";
export * from "./client";

export interface LomiConfig {
  baseUrl: string;
  apiKey?: string;
}

export class LomiSDK {
  private readonly config: LomiConfig;

  // Client instances
  public readonly merchants: MerchantsClient;
  public readonly products: ProductsClient;
  public readonly subscriptions: SubscriptionsClient;
  public readonly transactions: TransactionsClient;
  public readonly checkoutSessions: CheckoutSessionsClient;
  public readonly providers: ProvidersClient;
  public readonly ping: PingClient;
  public readonly webhooks: WebhooksClient;
  public readonly customers: CustomersClient;
  public readonly refunds: RefundsClient;
  public readonly paymentLinks: PaymentLinksClient;

  constructor(config: LomiConfig) {
    this.config = config;

    // Initialize clients
    this.merchants = new MerchantsClient(config.baseUrl, config.apiKey);
    this.products = new ProductsClient(config.baseUrl, config.apiKey);
    this.subscriptions = new SubscriptionsClient(config.baseUrl, config.apiKey);
    this.transactions = new TransactionsClient(config.baseUrl, config.apiKey);
    this.checkoutSessions = new CheckoutSessionsClient(
      config.baseUrl,
      config.apiKey,
    );
    this.providers = new ProvidersClient(config.baseUrl, config.apiKey);
    this.ping = new PingClient(config.baseUrl, config.apiKey);
    this.webhooks = new WebhooksClient(config.baseUrl, config.apiKey);
    this.customers = new CustomersClient(config.baseUrl, config.apiKey);
    this.refunds = new RefundsClient(config.baseUrl, config.apiKey);
    this.paymentLinks = new PaymentLinksClient(config.baseUrl, config.apiKey);
  }

  /**
   * Initialize the SDK with the given configuration
   */
  static init(config: LomiConfig): LomiSDK {
    return new LomiSDK(config);
  }
}

// Example usage:
/*
const sdk = LomiSDK.init({
  baseUrl: 'https://api.lomi.africa/v1',
  apiKey: 'your-api-key'
});

// Get merchant details
const merchant = await sdk.merchants.get('merchant-id');

// List merchant's connected providers
const providers = await sdk.merchants.getProviders('merchant-id');

// Create a checkout session
const session = await sdk.checkoutSessions.create({
  merchant_id: 'merchant-id',
  success_url: 'https://your-site.com/success',
  cancel_url: 'https://your-site.com/cancel',
  provider_codes: ['ORANGE', 'WAVE']
});
*/
