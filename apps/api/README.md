# lomi. SDK

The official Node.js SDK for integrating lomi.'s payment infrastructure.

## Installation

```bash
npm install lomi.cli
# or
yarn add lomi.cli
# or
pnpm add lomi.cli
```

## Quick Start

## Deployment

### Vercel Deployment

When deploying to Vercel, the application is automatically configured to run in a serverless environment. Key considerations:

- File system operations are limited in serverless environments
- Winston logger is configured to use only Console transports in production
- File logging is disabled in production to prevent ENOENT errors
- Set `NODE_ENV=production` in your Vercel environment variables

### Local Development

For local development:

- File logging is enabled
- Logs are stored in the `logs/` directory
- Make sure the `logs` directory exists in your development environment

## Support

- [Documentation](https://docs.lomi.africa)
- [API Reference](https://docs.lomi.africa/api)
- [Support Email](mailto:hello@lomi.africa)