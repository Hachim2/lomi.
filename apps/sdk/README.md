# lomi. SDK

Official Node.js SDK for interacting with the [lomi.](https://lomi.africa) payment platform API.

This SDK is automatically generated from the lomi. OpenAPI specification.

## Installation

```bash
# Using pnpm (recommended for this monorepo)
pnpm add @lomi./sdk

# Using npm
npm install @lomi./sdk

# Using yarn
yarn add @lomi./sdk
```

## Usage

Import the `OpenAPI` client and configure it with your API key. Then access the different API services.

```typescript
import { OpenAPI, CustomersService, CreateCustomer, type Customer } from '@lomi./sdk';

// Configure your API key (obtainable from your lomi. dashboard)
OpenAPI.HEADERS = {
  'X-API-KEY': 'YOUR_LOMI_API_KEY',
};

// Optionally configure the base URL if not using the default production URL
// OpenAPI.BASE = 'https://sandbox.api.lomi.africa/v1';

async function createNewCustomer() {
  try {
    const customerData: CreateCustomer = {
      merchant_id: 'YOUR_MERCHANT_ID', // Usually obtained via authentication
      organization_id: 'YOUR_ORGANIZATION_ID', // Usually obtained via authentication
      name: 'Test Customer',
      email: 'customer@example.com',
      phone_number: '+221771234567',
    };

    const newCustomer: Customer = await CustomersService.createCustomer(customerData);
    console.log('Customer created:', newCustomer);

  } catch (error) {
    console.error('Error creating customer:', error);
  }
}

createNewCustomer();
```

Refer to the `src/generated/services` directory and the [lomi. API Documentation](https://docs.lomi.africa) for details on available services and methods.

## Contributing

Please refer to the main [CONTRIBUTING.md](https://github.com/lomiafrica/lomi./blob/master/CONTRIBUTING.md) in the monorepo.

## Support

Contact [hello@lomi.africa](mailto:hello@lomi.africa) or visit our [support center](https://docs.lomi.africa/docs/support/contact).

## License

This project is licensed under the [MIT License](LICENSE). 