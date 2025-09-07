import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as Types from '../src/types/api';

// Path to SQL schema file - Fixed path resolution
const schemaPath = resolve(join(__dirname, '../../website/supabase/functions/20240828000002_db.sql'));
const schemaContent = readFileSync(schemaPath, 'utf8');

console.log('🔍 Verifying type consistency between SQL schema and TypeScript...');

// Extract SQL enum types
function extractSqlEnums(sqlContent: string): Record<string, string[]> {
  const enumRegex = /CREATE TYPE (\w+) AS ENUM \(([^)]+)\);/g;
  const enums: Record<string, string[]> = {};
  
  let match;
  while ((match = enumRegex.exec(sqlContent)) !== null) {
    const enumName = match[1];
    // Extract enum values and clean them (remove quotes, commas, whitespace)
    const enumValues = match[2]
      .split(',')
      .map(value => value.trim().replace(/'/g, ''));
    
    enums[enumName] = enumValues;
  }
  
  return enums;
}

// Map SQL enum types to TS enum names
const sqlToTsEnumMap: Record<string, string> = {
  'transaction_status': 'TransactionStatus',
  'transaction_type': 'TransactionType',
  'provider_code': 'ProviderCode',
  'payment_method_code': 'PaymentMethodCode',
  'currency_code': 'CurrencyCode',
  'refund_status': 'RefundStatus',
  'frequency': 'Frequency',
  'failed_payment_action': 'FailedPaymentAction',
  'first_payment_type': 'FirstPaymentType',
  'checkout_session_status': 'CheckoutSessionStatus',
  'provider_business_type': 'ProviderBusinessType',
  // Add more mappings as needed
};

// Extract TS enum values
function getTsEnumValues(enumObj: any): string[] {
  return Object.values(enumObj).filter(value => typeof value === 'string');
}

// Verify enums
function verifyEnums(sqlEnums: Record<string, string[]>): void {
  let inconsistencies = 0;
  
  Object.entries(sqlToTsEnumMap).forEach(([sqlName, tsName]) => {
    const sqlValues = sqlEnums[sqlName] || [];
    const tsEnum = (Types as any)[tsName];
    
    if (!tsEnum) {
      console.error(`❌ TypeScript enum ${tsName} not found for SQL enum ${sqlName}`);
      inconsistencies++;
      return;
    }
    
    const tsValues = getTsEnumValues(tsEnum);
    
    // Check for missing values in TS
    const missingInTs = sqlValues.filter(val => !tsValues.includes(val));
    if (missingInTs.length > 0) {
      console.error(`❌ Values missing in TypeScript enum ${tsName}: ${missingInTs.join(', ')}`);
      inconsistencies++;
    }
    
    // Check for extra values in TS
    const extraInTs = tsValues.filter(val => !sqlValues.includes(val));
    if (extraInTs.length > 0) {
      console.error(`❌ Extra values in TypeScript enum ${tsName} not in SQL: ${extraInTs.join(', ')}`);
      inconsistencies++;
    }
    
    if (missingInTs.length === 0 && extraInTs.length === 0) {
      console.log(`✅ Enum ${sqlName} (${tsName}) is consistent`);
    }
  });
  
  if (inconsistencies === 0) {
    console.log('✅ All enum types are consistent between SQL and TypeScript');
  } else {
    console.error(`❌ Found ${inconsistencies} inconsistencies between SQL and TypeScript enums`);
  }
}

// Extract interfaces and table definitions for more advanced checks
// This is a simplified version - you might want to enhance this
function verifyInterfaces(): void {
  // Interface to table mapping could be added here
  console.log('⚠️ Interface validation with tables requires additional implementation');
}

// Run verifications
const sqlEnums = extractSqlEnums(schemaContent);
verifyEnums(sqlEnums);
verifyInterfaces();

console.log('✨ Verification complete'); 