<p align="center">
	<img src="apps/docs/public/transparent_l.webp" width="200" height="200" alt="lomi. icon">
	<h1 align="center"><b>lomi.</b></h1>
<p align="center">
    Helping West African ventures sell online
  </p>
</p>

<div align="center">

<a href="https://lomi.africa">Website</a>
<span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
<a href="https://docs.lomi.africa">Docs</a>
<span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
<a href="https://lomi.africa/blog">Blog</a>

<p align="center">
<p align="center">
  <a href="https://github.com/lomiafrica/lomi./blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
  <a href="https://discord.gg/yb4FnBmh">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=lomiafrica">
    <img src="https://img.shields.io/twitter/follow/lomiafrica.svg?label=Follow%20@lomiafrica" alt="Follow @lomiafrica" />
  </a>
  <a href="https://www.linkedin.com/company/lomiafri">
    <img src="https://img.shields.io/badge/LinkedIn-lomiafrica-blue?style=flat&logo=linkedin" alt="lomi. LinkedIn" />
  </a>
  <a href="https://join.slack.com/t/lomi-a/shared_invite/zt-3hezykfvo-eW1jX6IkXAqht875Y1wUOw">
    <img src="https://img.shields.io/badge/Slack-lomi--a-4A154B?style=flat&logo=slack" alt="Join lomi. on Slack" />
  </a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/posts/lomi?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-lomi" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=720260&theme=dark&t=1736800231403" 
    alt="lomi. - Simplifying payments across francophone West Africa | Product Hunt"
    width="250" height="54" />
  </a>
</p>

</div>
<hr />

## About lomi.

lomi. is an open-source payment processing platform that integrates multiple payment service providers and provides a seamless experience for merchants and their customers across West Africa and beyond. Our platform simplifies product, services, usage, and subscription billing while ensuring the highest levels of security, reliability, and compliance.

## Open-source roadmap

We are progressively open-sourcing the entire lomi. project:

- **Currently Open-source**:
  - Documentation: **[apps/docs](./apps/docs)**
  - CLI tool: **[apps/cli](./apps/cli)**
  - APIs: **[apps/api](./apps/api)**
  - SDK: **[apps/sdk](./apps/sdk)**
  - Boilerplate Next.js + Sanity: **[apps/events](https://github.com/lomiafrica/events/)**

- **Opening soon**:
  - Merchant dashboard: **[apps/website](./apps/website)**
  - Shopify extension: **[apps/shopify](./apps/shopify)**

Everything will be made available in the coming weeks and all separate repositories will be merged in the monorepo.

## Features

<div align="left">
  <p>
    <strong>🌍 PI-SPI integration</strong><br/>
    Built on BCEAO's official payment interoperability platform, enabling seamless Bank-to-Bank, Bank-to-Wallet, Wallet-to-Bank, and Wallet-to-Wallet transactions across 8 UEMOA countries through a single unified API.
  </p>
  
  <p>
    <strong>🌐 International payments</strong><br/>
    Accept international credit card payments and process transactions in multiple currencies.
  </p>
  
  <p>
    <strong>🎨 Customizable checkout</strong><br/>
    Create beautiful, branded checkout experiences that work across all devices.
  </p>

  <p>
    <strong>🔄 Recurrent payment processing</strong><br/> 
    Automate subscription payments and recurring invoices with seamless support for mobile money (WhatsApp) and card payments via email.
  </p>
  
  <p>
    <strong>👤 End-customer portal</strong><br/>
    Provide customers with a self-service portal to manage their payment methods, view transaction history, request refunds, update subscription and account details.
  </p>
  
  <p>
    <strong>📊 Comprehensive analytics</strong><br/>
    Gain valuable insights into your customers payment behavior, conversion rates, and payment trends.
  </p>
  
  <p>
    <strong>🛡️ Fraud detection</strong><br/>
    Advanced fraud prevention tools to protect your business and customers.
  </p>
  
  <p>
    <strong>🔔 Webhook management</strong><br/>
    Real-time notifications for payment events to keep your systems in sync.
  </p>
  
  <p>
    <strong>🔒 Secure tokenization</strong><br/>
    Safely store customers payment details for future transactions without handling sensitive data.
  </p>
  
  <p>
    <strong>👥 Role-based access control</strong><br/>
    Manage team permissions with granular control over who can access what.
  </p>

  <p>
    <strong>🏦 Instant payouts for merchants</strong><br/>
    Enable businesses to access their funds instantly via mobile money or bank withdrawals.
  </p>
</div>

## Core infrastructure

- TypeScript
- Node.js/Bun
- Vite
- Nextjs
- React
- React Native
- Shadcn UI
- Radix UI
- Base UI
- PostgreSQL via Supabase
- Resend
- Upstash Redis
- Anthropic
- Huggingface
- Infobip
- Tailwind CSS
- Mixpanel
- Sanity

## Payment infrastructure

### PI-SPI

lomi. integrates with the **SPI**, the official Central Bank-backed payment interoperability platform. With lomi., you can accept payments across 8 UEMOA countries (Benin, Burkina Faso, Côte d'Ivoire, Guinea-Bissau, Mali, Niger, Senegal, Togo). Our platform enables Bank-to-Bank, Bank-to-Wallet, Wallet-to-Bank, and Wallet-to-Wallet transactions through our suite of APIs.

The platform provides instant payment confirmation and settlement, allowing you to send payments using SHID, MCOD, or MBNO aliases without ever sharing account numbers. We offer native support for the West African CFA Franc (XOF).

For fellow fintechs, we built an SDK around this infrastructure: `@lomi/pi-spi-sdk` - a community TypeScript SDK for the PI-SPI Business API ([apps/pi-spi-sdk](./apps/pi-spi-sdk)).

### Additional payment providers

For merchants operating outside UEMOA, lomi. is built on Stripe to enable international payments, including cards and cryptocurrencies.

## Quick start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** or **bun** package manager
- **PostgreSQL** >= 15 (for local development)
- **Supabase CLI** (optional, for local Supabase instance)
- **PI-SPI API credentials** (for UEMOA payment processing)
- **Stripe Connect** for international credit card payment processing

### Database setup

lomi. uses **separate database configurations** for local development and production:

- **Local development**: Uses local PostgreSQL instance via Supabase CLI
- **Production**: Uses Supabase cloud instance with enhanced security and scalability

This separation ensures safe testing without affecting production data, independent schema evolution, and environment-specific optimizations.

### Local development (via merchant dashboard)
```bash
# Clone the repository
git clone https://github.com/lomiafrica/lomi./
cd lomi.

# Set up environment variables
cp apps/dashboard/.env.example apps/dashboard/.env
cd apps/dashboard

# Start the development server
pnpm run dev
```

## Documentation

For comprehensive documentation, visit [docs.lomi.africa](https://docs.lomi.africa)

## Use cases

- **E-commerce**: Sell physical or digital products online through your website or platforms like Shopify or WooCommerce. Transactions are typically one-time purchases.

- **SaaS (Software as a Service)**: Offer software on a subscription basis, with automated recurring billing for continuous access.

- **Usage billing for AI companies**: Create a meter and charge your customers as they use your services

- **Subscription services**: Manage recurring payments for memberships, content access, and digital products.

- **Crowdfunding & Donations**: Process payments for fundraising platforms, nonprofits, and charities.

- **On-demand services**: Enable instant payments for ride-sharing, food delivery, and freelance platforms.

- **B2B payments**: Support invoicing, large transactions, and business-to-business billing. 

- **Financial services & Fintech**: Power embedded finance, payouts, and banking-as-a-service solutions.

- **Education**: Collect payments for courses, e-learning platforms, and certifications.

- **Events & Ticketing**: Sell tickets for concerts, conferences, and online events.

## License

This project is dual-licensed:

1. The majority of the codebase is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). This means you can freely use, modify, and distribute this code while ensuring that any modifications you make are also open-source.

2. Certain files marked with `/* @proprietary license */` are under lomi.africa's LLC Commercial License. These files require a valid commercial license from lomi. for production use.

See the [LICENSE](https://github.com/lomiafrica/lomi.?tab=License-1-ov-file) file for the complete terms of both licenses.

## Contributing

We welcome contributions to lomi.! This document outlines how to submit changes and which conventions to follow.

### Prerequisites

You should be familiar with GitHub issues and pull requests, have read our [documentation](https://docs.lomi.africa), and have already set up your local instance with `git clone https://github.com/lomiafrica/lomi./` or via `npx install lomi.cli`.

### Contribution process

1. **Issues First**: Before working on a change, make sure there's an issue for it. Find an [existing issue](https://github.com/lomiafrica/lomi./issues) or [open a new one](https://github.com/lomiafrica/lomi./issues/new).

2. **Fork & Branch**: Fork the repository and create a branch from `develop` with a descriptive prefix:
   - `fix/` for bug fixes
   - `feat/` for features
   - `docs/` for documentation changes

3. **Make changes**: Keep your commits small and focused and ensure that your contribution doesn't modify files marked with `/* @proprietary license *

4. **Submit PR**: Open a pull request against the `develop` branch. Include a clear description following the What-Why-How-Testing structure.

5. **Code review**: A team member will review your PR within a few hours/days.

For detailed contribution guidelines, please see our [CONTRIBUTING.md](https://github.com/lomiafrica/lomi./blob/master/CONTRIBUTING.md).

## Community & support

Join our [community Discord](https://discord.gg/yb4FnBmh) for discussions and help, follow [@lomiafrica](https://twitter.com/lomiafrica) on Twitter for updates, or connect with us on [Slack](https://join.slack.com/t/lomi-a/shared_invite/zt-3hezykfvo-eW1jX6IkXAqht875Y1wUOw). Submit [issues](https://github.com/lomiafrica/lomi./issues) on GitHub for bug reports and feature requests, or contact us directly at [hello@lomi.africa](mailto:hello@lomi.africa).

## Security

For security vulnerabilities, please follow our [Security Policy](https://github.com/lomiafrica/lomi.?tab=security-ov-file). Please do not report security vulnerabilities through public GitHub issues.