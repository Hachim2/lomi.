import { parse } from 'yaml';
import { writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

interface SchemaObject {
  type?: string;
  enum?: string[];
  properties?: Record<string, SchemaObject>;
  required?: string[];
  format?: string;
  items?: SchemaObject;
  $ref?: string;
  allOf?: SchemaObject[];
  additionalProperties?: boolean | SchemaObject;
}

interface OpenAPISpec {
  components: {
    schemas: Record<string, SchemaObject>;
  };
}

function generateTypeDefinitions(spec: OpenAPISpec): string {
  const components = spec.components?.schemas || {};
  let output = '// Generated TypeScript types from OpenAPI specification\n\n';
  
  // Generate enums
  for (const [name, schema] of Object.entries<SchemaObject>(components)) {
    if (schema.enum) {
      output += `export enum ${name} {\n`;
      schema.enum.forEach((value: string) => {
        output += `  ${value.replace(/-/g, '_')} = '${value}',\n`;
      });
      output += '}\n\n';
      continue;
    }
  }
  
  // Generate interfaces
  for (const [name, schema] of Object.entries<SchemaObject>(components)) {
    if (schema.type === 'object' || schema.allOf) {
      output += `export interface ${name} extends Record<string, unknown> {\n`;
      
      if (schema.allOf) {
        // Handle inheritance
        schema.allOf.forEach((part: SchemaObject) => {
          if (part.$ref) {
            const refName = part.$ref.split('/').pop();
            output += `  // Extends ${refName}\n`;
          }
          if (part.properties) {
            Object.entries(part.properties).forEach(([propName, propSchema]: [string, SchemaObject]) => {
              const type = getTypeFromSchema(propSchema);
              const isRequired = propSchema.required || (part.required?.includes(propName) ?? false);
              output += `  ${propName}${isRequired ? '' : '?'}: ${type};\n`;
            });
          }
        });
      } else if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, SchemaObject]) => {
          const type = getTypeFromSchema(propSchema);
          const isRequired = schema.required?.includes(propName) ?? false;
          output += `  ${propName}${isRequired ? '' : '?'}: ${type};\n`;
        });
      }
      
      // Add index signature if additionalProperties is true or undefined
      if (schema.additionalProperties !== false) {
        output += '  [key: string]: unknown;\n';
      }
      
      output += '}\n\n';
    }
  }
  
  return output;
}

function getTypeFromSchema(schema: SchemaObject): string {
  if (schema.$ref) {
    return schema.$ref.split('/').pop() || 'unknown';
  }
  
  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        return schema.enum.map((v: string) => `'${v}'`).join(' | ');
      }
      if (schema.format === 'date-time') return 'Date';
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return schema.items ? `Array<${getTypeFromSchema(schema.items)}>` : 'unknown[]';
    case 'object':
      if (schema.additionalProperties) {
        if (typeof schema.additionalProperties === 'object') {
          return `Record<string, ${getTypeFromSchema(schema.additionalProperties)}>`;
        }
        return 'Record<string, unknown>';
      }
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

async function generateTypes(): Promise<void> {
  try {
    const specPath = resolve(__dirname, '../openapi/spec.yaml');
    const outputPath = resolve(__dirname, '../src/types/api.ts');
    
    // Read and parse YAML
    const yamlContent = readFileSync(specPath, 'utf8');
    const spec = parse(yamlContent) as OpenAPISpec;
    
    // Make sure the directory exists
    const typesDir = resolve(__dirname, '../src/types');
    if (!existsSync(typesDir)) {
      mkdirSync(typesDir, { recursive: true });
    }
    
    // Generate TypeScript interfaces
    const types = generateTypeDefinitions(spec);
    
    // Write to file
    writeFileSync(outputPath, types);
    console.log('✅ Successfully generated TypeScript types');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error generating types:', error.message);
    } else {
      console.error('❌ Error generating types:', String(error));
    }
    process.exit(1);
  }
}

generateTypes(); 