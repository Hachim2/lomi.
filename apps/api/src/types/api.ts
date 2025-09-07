// Generated TypeScript types from OpenAPI specification

export enum CurrencyCode {
  XOF = 'XOF',
  USD = 'USD',
  EUR = 'EUR',
  GHS = 'GHS',
  NGN = 'NGN',
  KES = 'KES',
  MRO = 'MRO',
}

export enum TransactionType {
  payment = 'payment',
  instalment = 'instalment',
}

export enum TransactionStatus {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
  refunded = 'refunded',
  expired = 'expired',
}

export enum ProviderCode {
  ORANGE = 'ORANGE',
  WAVE = 'WAVE',
  ECOBANK = 'ECOBANK',
  MTN = 'MTN',
  NOWPAYMENTS = 'NOWPAYMENTS',
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
  MOOV = 'MOOV',
  AIRTEL = 'AIRTEL',
  MPESA = 'MPESA',
  OPAY = 'OPAY',
  PAYPAL = 'PAYPAL',
  OZOW = 'OZOW',
  OTHER = 'OTHER',
}

export enum PaymentMethodCode {
  CARDS = 'CARDS',
  MOBILE_MONEY = 'MOBILE_MONEY',
  E_WALLET = 'E_WALLET',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  USSD = 'USSD',
  QR_CODE = 'QR_CODE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CRYPTO = 'CRYPTO',
  PAYPAL = 'PAYPAL',
  OTHER = 'OTHER',
}

export enum BillingFrequency {
  weekly = 'weekly',
  bi_weekly = 'bi-weekly',
  monthly = 'monthly',
  bi_monthly = 'bi-monthly',
  quarterly = 'quarterly',
  semi_annual = 'semi-annual',
  yearly = 'yearly',
}

export enum Frequency {
  weekly = 'weekly',
  bi_weekly = 'bi-weekly',
  monthly = 'monthly',
  bi_monthly = 'bi-monthly',
  quarterly = 'quarterly',
  semi_annual = 'semi-annual',
  yearly = 'yearly',
}

export enum FailedPaymentAction {
  cancel = 'cancel',
  pause = 'pause',
  continue = 'continue',
}

export enum FirstPaymentType {
  initial = 'initial',
  non_initial = 'non_initial',
}

export enum MemberRole {
  Admin = 'Admin',
  Member = 'Member',
}

export enum PaymentLinkType {
  product = 'product',
  plan = 'plan',
  instant = 'instant',
}

export enum WebhookEvent {
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_CREATED = 'REFUND_CREATED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  CHECKOUT_COMPLETED = 'CHECKOUT_COMPLETED',
  PROVIDER_STATUS_CHANGED = 'PROVIDER_STATUS_CHANGED',
}

export enum RefundStatus {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
}

export enum CheckoutSessionStatus {
  open = 'open',
  completed = 'completed',
  expired = 'expired',
}

export enum SubscriptionStatus {
  pending = 'pending',
  active = 'active',
  paused = 'paused',
  cancelled = 'cancelled',
  expired = 'expired',
  past_due = 'past_due',
  trial = 'trial',
}

export enum PayoutStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
}

export enum OrganizationStatus {
  active = 'active',
  inactive = 'inactive',
  suspended = 'suspended',
}

export enum FeeType {
  percentage = 'percentage',
  fixed = 'fixed',
  both = 'both',
}

export enum ProviderBusinessType {
  fintech = 'fintech',
  other = 'other',
}

export interface Error extends Record<string, unknown> {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Currency extends Record<string, unknown> {
  code: CurrencyCode;
  name: string;
  [key: string]: unknown;
}

export interface Fee extends Record<string, unknown> {
  fee_id: string;
  name: string;
  transaction_type: TransactionType;
  fee_type: FeeType;
  percentage: number;
  fixed_amount: number;
  currency_code: CurrencyCode;
  payment_method_code?: PaymentMethodCode;
  provider_code?: ProviderCode;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface Merchant extends Record<string, unknown> {
  merchant_id?: string;
  name?: string;
  email?: string;
  phone_number?: string;
  organization_id?: string;
  country?: string;
  mrr?: number;
  arr?: number;
  merchant_lifetime_value?: number;
  retry_payment_every?: number;
  total_retries?: number;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface ConnectedProvider extends Record<string, unknown> {
  provider_code?: ProviderCode;
  name?: string;
  description?: string;
  is_connected?: boolean;
  provider_merchant_id?: string;
  provider_business_type?: ProviderBusinessType;
  phone_number?: string;
  is_phone_verified?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface OrganizationProviderSettings extends Record<string, unknown> {
  organization_id: string;
  provider_code: ProviderCode;
  provider_merchant_id?: string;
  is_connected: boolean;
  phone_number?: string;
  is_phone_verified: boolean;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateProduct extends Record<string, unknown> {
  name: string;
  description?: string;
  price: number;
  currency_code: CurrencyCode;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface Product extends Record<string, unknown> {
  // Extends CreateProduct
  product_id?: string;
  merchant_id?: string;
  organization_id?: string;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateSubscriptionPlan extends Record<string, unknown> {
  name: string;
  description?: string;
  amount: number;
  currency_code: CurrencyCode;
  billing_frequency: BillingFrequency;
  failed_payment_action?: FailedPaymentAction;
  charge_day?: number;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
  first_payment_type?: FirstPaymentType;
  [key: string]: unknown;
}

export interface SubscriptionPlan extends Record<string, unknown> {
  // Extends CreateSubscriptionPlan
  plan_id?: string;
  merchant_id?: string;
  organization_id?: string;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface Subscription extends Record<string, unknown> {
  subscription_id: string;
  merchant_id: string;
  organization_id: string;
  plan_id: string;
  customer_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date?: string;
  next_billing_date?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateSubscription extends Record<string, unknown> {
  merchant_id: string;
  organization_id: string;
  plan_id: string;
  customer_id: string;
  start_date: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateTransaction extends Record<string, unknown> {
  merchant_id: string;
  organization_id: string;
  customer_id: string;
  product_id?: string;
  subscription_id?: string;
  transaction_type: TransactionType;
  description?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  fee_reference: string;
  currency_code: CurrencyCode;
  provider_code: ProviderCode;
  payment_method_code: PaymentMethodCode;
  [key: string]: unknown;
}

export interface Transaction extends Record<string, unknown> {
  // Extends CreateTransaction
  transaction_id?: string;
  status?: TransactionStatus;
  quantity?: number;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateCheckoutSession extends Record<string, unknown> {
  merchant_id: string;
  organization_id: string;
  title?: string;
  public_description?: string;
  product_id?: string;
  subscription_id?: string;
  plan_id?: string;
  amount: number;
  currency_code: CurrencyCode;
  success_url: string;
  cancel_url: string;
  allowed_providers: Array<ProviderCode>;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  allow_coupon_code?: boolean;
  allow_quantity?: boolean;
  quantity?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CheckoutSession extends Record<string, unknown> {
  // Extends CreateCheckoutSession
  checkout_session_id?: string;
  payment_link_id?: string;
  url?: string;
  allow_quantity?: boolean;
  quantity?: number;
  status?: CheckoutSessionStatus;
  created_at?: Date;
  updated_at?: Date;
  expires_at?: Date;
  [key: string]: unknown;
}

export interface Provider extends Record<string, unknown> {
  code?: ProviderCode;
  name?: string;
  description?: string;
  payment_methods?: Array<PaymentMethodCode>;
  is_connected?: boolean;
  [key: string]: unknown;
}

export interface Refund extends Record<string, unknown> {
  refund_id: string;
  transaction_id: string;
  amount: number;
  refunded_amount: number;
  fee_amount: number;
  status: RefundStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateRefund extends Record<string, unknown> {
  transaction_id: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Customer extends Record<string, unknown> {
  customer_id: string;
  merchant_id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  country?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  is_business?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateCustomer extends Record<string, unknown> {
  merchant_id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  country?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  is_business?: boolean;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MerchantOrganizationLink extends Record<string, unknown> {
  merchant_org_id: string;
  merchant_id?: string;
  organization_id: string;
  role: MemberRole;
  store_handle: string;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface MerchantAccount extends Record<string, unknown> {
  account_id: string;
  merchant_id?: string;
  organization_id: string;
  balance: number;
  currency_code: CurrencyCode;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreatePaymentLink extends Record<string, unknown> {
  merchant_id?: string;
  organization_id?: string;
  link_type: PaymentLinkType;
  product_id?: string;
  plan_id?: string;
  title: string;
  public_description?: string;
  price?: number;
  currency_code: CurrencyCode;
  allowed_providers?: Array<ProviderCode>;
  allow_coupon_code?: boolean;
  allow_quantity?: boolean;
  quantity?: number;
  is_active?: boolean;
  expires_at?: Date;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaymentLink extends Record<string, unknown> {
  // Extends CreatePaymentLink
  link_id?: string;
  organization_id?: string;
  url?: string;
  allow_quantity?: boolean;
  quantity?: number;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

export interface CreateWebhook extends Record<string, unknown> {
  merchant_id: string;
  organization_id: string;
  url: string;
  authorized_events: Array<WebhookEvent>;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Webhook extends Record<string, unknown> {
  // Extends CreateWebhook
  webhook_id?: string;
  verification_token?: string;
  last_triggered_at?: Date;
  last_payload?: Record<string, unknown>;
  last_response_status?: number;
  last_response_body?: string;
  retry_count?: number;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

