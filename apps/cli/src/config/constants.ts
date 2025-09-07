export const API_URLS = {
  production: "https://api.lomi.africa",
  sandbox: "https://sandbox.api.lomi.africa",
  local: "http://localhost:4242",
} as const;

export const DEFAULT_PORT = 4242;

export const WEBHOOK_EVENTS = [
  "TRANSACTION_CREATED",
  "TRANSACTION_COMPLETED",
  "TRANSACTION_FAILED",
  "REFUND_CREATED",
  "REFUND_COMPLETED",
  "REFUND_FAILED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_CANCELLED",
  "PAYMENT_LINK_CREATED",
  "PAYMENT_LINK_UPDATED",
  "PAYMENT_LINK_DELETED",
  "PROVIDER_CONNECTED",
  "PROVIDER_DISCONNECTED",
] as const;

export const CONFIG_DEFAULTS = {
  environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  port: DEFAULT_PORT,
};
