import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

// Paths with fixed path resolution
const migrationsDir = '/Users/babacar/Projects/lomi./apps/website/supabase/migrations';
const clientDir = resolve(__dirname, '../src/client');

console.log(`Looking for SQL files in: ${migrationsDir}`);
console.log(`Looking for client files in: ${clientDir}`);

// Get all SQL functions
async function getSqlFunctions(): Promise<string[]> {
  const migrationsDir = '/Users/babacar/Projects/lomi./apps/website/supabase/migrations';
  console.log(`Searching for SQL files in ${migrationsDir}`);
  
  // Get all SQL files in the migrations directory
  const sqlFiles = (await fs.promises.readdir(migrationsDir))
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(migrationsDir, file));
  
  console.log(`Found ${sqlFiles.length} SQL files`);
  
  const allFunctions: string[] = [];
  
  // Process each SQL file
  for (const sqlFile of sqlFiles) {
    const fileContent = await fs.promises.readFile(sqlFile, 'utf8');
    
    // Find all CREATE FUNCTION statements
    const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s*\(/gi;
    let match;
    const fileFunctions: string[] = [];
    
    while ((match = functionRegex.exec(fileContent)) !== null) {
      const functionName = match[1].toLowerCase();
      fileFunctions.push(functionName);
      allFunctions.push(functionName);
    }
    
    if (fileFunctions.length > 0) {
      console.log(`Found ${fileFunctions.length} functions in ${path.basename(sqlFile)}`);
    }
  }
  
  console.log(`Found ${allFunctions.length} SQL functions across all migration files`);
  return allFunctions;
}

// Extract client methods from TypeScript files
function extractClientMethods(): Map<string, string[]> {
  const clientMap = new Map<string, string[]>();
  
  // Get all .ts files except index.ts and BaseClient.ts
  const files = readdirSync(clientDir)
    .filter(file => file.endsWith('.ts') && 
      file !== 'index.ts' && 
      file !== 'BaseClient.ts' &&
      !file.startsWith('.'));
  
  for (const file of files) {
    const clientName = file.replace('.ts', '');
    const resourceName = clientName.replace('Client', '').toLowerCase();
    
    const content = readFileSync(join(clientDir, file), 'utf8');
    
    // Extract method names
    const methodRegex = /public async ([a-zA-Z]+)/g;
    const methods: string[] = [];
    
    let methodMatch;
    while ((methodMatch = methodRegex.exec(content)) !== null) {
      methods.push(methodMatch[1]);
    }
    
    clientMap.set(resourceName, methods);
  }
  
  return clientMap;
}

// Map client method names to SQL function names
function mapMethodToFunction(methodName: string, resourceName: string): string[] {
  // Handle plurals like "checkoutsessions" -> "checkout_session"
  let singularResource = resourceName;
  
  // Special case for plural forms
  if (resourceName.endsWith('s')) {
    // Handle special cases first
    if (resourceName === 'checkoutsessions') {
      singularResource = 'checkout_session';
    } else if (resourceName === 'paymentlinks') {
      singularResource = 'payment_link';
    } else if (resourceName === 'customersubscriptions') {
      singularResource = 'subscription';
    } else {
      // Standard plurals
      singularResource = resourceName.slice(0, -1);
    }
  }
  
  // Handle custom mappings for resources
  const resourceMap: Record<string, string> = {
    'ping': 'ping',
    'refunds': 'refund',
    'webhooks': 'webhook',
    'subscriptions': 'subscription_plan',
    'transactions': 'transaction',
    'providers': 'provider',
    'products': 'product',
    'customers': 'customer',
    'merchants': 'merchant',
    'customersubscriptions': 'subscription'
  };
  
  const mappedResource = resourceMap[resourceName] || singularResource;
  
  // Generate multiple potential SQL function names to check
  const possibleFunctions: string[] = [];
  
  // Add standard patterns based on method name
  // For example, "getPaymentLink" -> "get_payment_link"
  if (/^[a-z]+[A-Z]/.test(methodName)) {
    // Handle camelCase method names (e.g., getPaymentLink, listCustomers)
    const prefix = methodName.match(/^[a-z]+/)?.[0] || '';
    const suffix = methodName.replace(/^[a-z]+/, '');
    const snakeCaseSuffix = suffix
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    
    possibleFunctions.push(`${prefix}_${snakeCaseSuffix}`);
    
    // Try specific resource-based names
    possibleFunctions.push(`${prefix}_${mappedResource}`);
    possibleFunctions.push(`${prefix}_${mappedResource}_${snakeCaseSuffix}`);
  }
  
  // Direct mappings from search results
  const directMappings: Record<string, Record<string, string[]>> = {
    'paymentlinks': {
      'createPaymentLink': ['create_payment_link'],
      'getPaymentLink': ['get_payment_link'],
      'listPaymentLinks': ['list_payment_links', 'fetch_payment_links'],
      'updatePaymentLink': ['update_payment_link'],
      'deletePaymentLink': ['delete_payment_link', 'safe_delete_payment_link']
    },
    'customers': {
      'customer': ['get_customer'],
      'customers': ['list_customers'],
    },
    'checkoutsessions': {
      'checkoutSession': ['get_checkout_session'],
      'checkoutSessions': ['list_checkout_sessions']
    },
    'ping': {
      'ping': ['ping']
    },
    'subscriptions': {
      'subscriptionPlan': ['get_subscription_plan'],
      'subscriptionPlan2': ['get_subscription_plan'],
      'subscriptionPlan3': ['get_subscription_plan'],
      'create': ['create_subscription'],
      'list': ['list_subscription_plans', 'fetch_subscription_plans']
    },
    'transactions': {
      'create': ['create_transaction', 'process_payment', 'process_checkout_transaction'],
      'list': ['list_transactions', 'fetch_transactions'],
      'refundTransaction': ['create_refund']
    },
    'refunds': {
      'refund': ['get_refund'],
      'refund2': ['update_refund_status'],
      'refund3': ['create_refund']
    },
    'webhooks': {
      'list': ['fetch_organization_webhooks'],
      'get': ['get_webhook', 'fetch_organization_webhooks'],
      'regenerateSecret': ['regenerate_webhook_token']
    },
    'products': {
      'product': ['get_product'],
      'product2': ['get_product'],
      'product3': ['get_product']
    },
    'merchants': {
      'get': ['get_merchant'],
      'list': ['get_merchants', 'fetch_merchants', 'list_merchants']
    }
  };
  
  // Add direct mappings if they exist
  if (directMappings[resourceName]?.[methodName]) {
    possibleFunctions.push(...directMappings[resourceName][methodName]);
  }
  
  // Common patterns
  switch (methodName) {
    case 'get':
      possibleFunctions.push(`get_${mappedResource}`);
      possibleFunctions.push(`get_${resourceName}`);
      possibleFunctions.push(`fetch_${mappedResource}`);
      possibleFunctions.push(`fetch_${resourceName}`);
      
      // special cases
      if (resourceName === 'subscriptions') {
        possibleFunctions.push('get_merchant_subscription');
        possibleFunctions.push('get_subscription_plan');
      }
      break;
    case 'list': 
      possibleFunctions.push(`list_${resourceName}`);
      possibleFunctions.push(`list_${mappedResource}s`);
      possibleFunctions.push(`get_${resourceName}`);
      possibleFunctions.push(`get_all_${resourceName}`);
      possibleFunctions.push(`fetch_${resourceName}`);
      
      // Special cases for list
      if (resourceName === 'checkoutsessions') {
        possibleFunctions.push('list_checkout_sessions');
      } else if (resourceName === 'subscriptions') {
        possibleFunctions.push('list_merchant_subscriptions');
        possibleFunctions.push('list_subscription_plans');
        possibleFunctions.push('fetch_subscription_plans');
      } else if (resourceName === 'paymentlinks') {
        possibleFunctions.push('list_payment_links');
        possibleFunctions.push('fetch_payment_links');
      } else if (resourceName === 'webhooks') {
        possibleFunctions.push('list_merchant_webhooks');
        possibleFunctions.push('fetch_organization_webhooks');
      } else if (resourceName === 'customers') {
        possibleFunctions.push('list_customers');
      }
      break;
    case 'create':
      possibleFunctions.push(`create_${mappedResource}`);
      
      // Special cases for create
      if (resourceName === 'transactions') {
        possibleFunctions.push('process_transaction');
        possibleFunctions.push('create_checkout_transaction');
        possibleFunctions.push('process_payment');
        possibleFunctions.push('process_checkout_transaction');
      }
      break;
    case 'update':
      possibleFunctions.push(`update_${mappedResource}`);
      
      // Special cases for update
      if (resourceName === 'refunds') {
        possibleFunctions.push('update_refund_status');
      } else if (resourceName === 'subscriptions') {
        possibleFunctions.push('update_merchant_subscription');
        possibleFunctions.push('update_subscription_status');
      } else if (resourceName === 'webhooks') {
        possibleFunctions.push('update_organization_webhook');
      }
      break;
    case 'delete':
      possibleFunctions.push(`delete_${mappedResource}`);
      
      // Special cases for delete
      if (resourceName === 'paymentlinks') {
        possibleFunctions.push('delete_payment_link');
        possibleFunctions.push('safe_delete_payment_link');
      } else if (resourceName === 'subscriptions') {
        possibleFunctions.push('cancel_subscription');
        possibleFunctions.push('delete_subscription_plan');
      } else if (resourceName === 'webhooks') {
        possibleFunctions.push('delete_organization_webhook');
      }
      break;
    case 'ping':
      possibleFunctions.push('ping');
      possibleFunctions.push('health_check');
      possibleFunctions.push('health');
      break;
    default:
      // Try different patterns for custom methods
      possibleFunctions.push(`${methodName.toLowerCase()}_${mappedResource}`);
      
      // Handle methods like getProviders for merchant
      if (methodName.startsWith('get')) {
        const subResource = methodName.replace('get', '').toLowerCase();
        possibleFunctions.push(`get_${mappedResource}_${subResource}`);
        possibleFunctions.push(`get_merchant_providers`); // Special case
      }
  }
  
  return possibleFunctions;
}

// Main verification function
async function verifyEndpoints() {
  console.log('🔍 Verifying consistency between SQL functions and API client methods...');
  
  // Get SQL functions
  const sqlFunctions = await getSqlFunctions();
  
  // Get client files (excluding BaseClient, index, and subdirectories)
  const clientFiles = fs.readdirSync(clientDir)
    .filter(file => 
      file.endsWith('Client.ts') && 
      file !== 'BaseClient.ts' &&
      !file.startsWith('.') &&
      !fs.statSync(join(clientDir, file)).isDirectory()
    );
  
  console.log(`Found ${clientFiles.length} client files to check`);
  
  let totalClientMethods = 0;
  const missingFunctions: Array<{ resource: string, method: string, potentialMatches: string[] }> = [];
  
  // Process each client file
  for (const clientFile of clientFiles) {
    const content = fs.readFileSync(join(clientDir, clientFile), 'utf8');
    const resourceName = clientFile.replace('Client.ts', '').toLowerCase();
    
    // Extract public async methods
    const methodRegex = /public\s+async\s+([a-zA-Z0-9]+)\s*\(/g;
    let match;
    const methods: string[] = [];
    
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }
    
    if (methods.length === 0) continue;
    
    console.log(`\nResource: ${resourceName} (${methods.length} methods)`);
    totalClientMethods += methods.length;
    
    // Check each method for SQL function mappings
    for (const method of methods) {
      const possibleFunctions = mapMethodToFunction(method, resourceName);
      
      // Check if any of the possible function names exist in SQL
      const matches = possibleFunctions.filter(func => 
        sqlFunctions.includes(func.toLowerCase())
      );
      
      if (matches.length > 0) {
        console.log(`✅ ${method} → ${matches.join(', ')}`);
      } else {
        console.log(`❌ ${method} → No matching SQL function found.`);
        console.log(`   Tried: ${possibleFunctions.join(', ')}`);
        missingFunctions.push({
          resource: resourceName,
          method,
          potentialMatches: possibleFunctions
        });
      }
    }
  }
  
  // Summary
  console.log('\n--- Summary ---');
  console.log(`Found ${totalClientMethods} client methods across ${clientFiles.length} resources`);
  console.log(`${missingFunctions.length} client methods have no matching SQL function`);
  
  if (missingFunctions.length > 0) {
    console.log('\nMissing SQL functions:');
    missingFunctions.forEach(({ resource, method, potentialMatches }) => {
      console.log(`- ${resource}.${method} (tried: ${potentialMatches.join(', ')})`);
    });
  }
}

// Run the verification
verifyEndpoints().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
}); 