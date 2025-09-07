import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

// Paths with fixed path resolution
const migrationsDir = resolve(__dirname, '../../website/supabase/migrations');
const clientDir = resolve(__dirname, '../src/client');

console.log(`Looking for SQL files in: ${migrationsDir}`);

// Missing functions from the verification report
const missingFunctions = [
  { resource: 'paymentlinks', method: 'list', patterns: ['payment_link', 'paymentlink'] },
  { resource: 'paymentlinks', method: 'get', patterns: ['payment_link', 'paymentlink'] },
  { resource: 'paymentlinks', method: 'delete', patterns: ['payment_link', 'paymentlink'] },
  { resource: 'ping', method: 'ping', patterns: ['ping', 'health'] },
  { resource: 'subscriptions', method: 'get', patterns: ['subscription', 'merchant_subscription'] },
  { resource: 'subscriptions', method: 'update', patterns: ['subscription', 'merchant_subscription'] },
  { resource: 'subscriptions', method: 'delete', patterns: ['subscription', 'cancel'] },
  { resource: 'transactions', method: 'create', patterns: ['transaction', 'payment'] },
  { resource: 'webhooks', method: 'list', patterns: ['webhook', 'hook'] },
  { resource: 'webhooks', method: 'get', patterns: ['webhook', 'hook'] },
  { resource: 'webhooks', method: 'regenerateSecret', patterns: ['webhook', 'secret', 'token', 'verification'] }
];

// Get all SQL files from migrations directory
function getAllSqlFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => join(migrationsDir, file));
}

// Search for patterns in all SQL files
function findFunctionsWithPattern(patterns: string[]): Map<string, string[]> {
  const files = getAllSqlFiles();
  const results = new Map<string, string[]>();
  
  files.forEach(file => {
    try {
      const fileContent = readFileSync(file, 'utf8');
      const fileName = file.split('/').pop() || '';
      
      // Search for CREATE FUNCTION or CREATE OR REPLACE FUNCTION
      const functionRegex = /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)\s*\(/g;
      let match;
      
      while ((match = functionRegex.exec(fileContent)) !== null) {
        const fullFunctionName = match[2]; // public.function_name
        const functionName = fullFunctionName.split('.').pop() || '';
        
        // Check if any pattern matches
        if (patterns.some(pattern => functionName.includes(pattern))) {
          if (!results.has(fileName)) {
            results.set(fileName, []);
          }
          results.get(fileName)?.push(functionName);
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  });
  
  return results;
}

console.log('🔍 Searching for missing SQL functions...\n');

missingFunctions.forEach(({ resource, method, patterns }) => {
  console.log(`Searching for ${resource}.${method}...`);
  const results = findFunctionsWithPattern(patterns);
  
  if (results.size === 0) {
    console.log(`❌ No matching functions found for ${resource}.${method}\n`);
  } else {
    console.log(`✅ Found potential matches for ${resource}.${method}:`);
    results.forEach((functions, file) => {
      console.log(`  In ${file}:`);
      functions.forEach(fn => console.log(`    - ${fn}`));
    });
    console.log();
  }
});

console.log('✨ Search complete'); 