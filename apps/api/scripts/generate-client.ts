import { parse } from 'yaml';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const OPENAPI_PATH = resolve(__dirname, '../openapi/spec.yaml');
const OUTPUT_DIR = resolve(__dirname, '../src/client');

interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
}

interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: { [key: string]: ResponseObject };
  security?: SecurityRequirementObject[];
}

interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
}

interface RequestBodyObject {
  content: {
    [key: string]: {
      schema: SchemaObject;
    };
  };
}

interface ResponseObject {
  description: string;
  content?: {
    [key: string]: {
      schema: SchemaObject;
    };
  };
}

interface SchemaObject {
  $ref?: string;
  type?: string;
  items?: SchemaObject;
  properties?: { [key: string]: SchemaObject };
  required?: string[];
}

interface SecurityRequirementObject {
  [key: string]: string[];
}

interface OpenAPISpec {
  paths: { [key: string]: PathItem };
  components?: {
    schemas?: { [key: string]: SchemaObject };
  };
}

async function generateClient(): Promise<void> {
  try {
    // Create output directory if it doesn't exist
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Create core directory
    const coreDir = join(OUTPUT_DIR, 'core');
    if (!existsSync(coreDir)) {
      mkdirSync(coreDir, { recursive: true });
    }

    // Read and parse OpenAPI spec
    const yamlContent = readFileSync(OPENAPI_PATH, 'utf8');
    const spec = parse(yamlContent) as OpenAPISpec;

    // Generate core files
    generateBaseClient();
    generateApiError();

    // Generate API client classes
    generateApiClients(spec.paths);

    // Generate request/response types
    generateTypes();

    console.log('✅ Successfully generated API client');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error generating client:', error.message);
    } else {
      console.error('❌ Error generating client:', String(error));
    }
    process.exit(1);
  }
}

function generateBaseClient(): void {
  const content = `import { ApiError } from './core/ApiError';
import { ApiRequestOptions } from './core/ApiRequestOptions';
import { ApiResult } from './core/ApiResult';
import { ErrorBody } from './core/ErrorBody';

// Define HeadersInit type if not available
type HeadersInit = Record<string, string>;

export class BaseClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  protected async request<T>(options: ApiRequestOptions): Promise<ApiResult<T>> {
    const { method, path, params, data } = options;
    
    // First replace path parameters
    let resolvedPath = path;
    const queryParams: Record<string, string> = {};
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          const placeholder = \`{\${key}}\`;
          if (resolvedPath.includes(placeholder)) {
            resolvedPath = resolvedPath.replace(placeholder, String(value));
          } else {
            queryParams[key] = String(value);
          }
        }
      });
    }

    const url = new URL(resolvedPath, this.baseUrl);
    
    // Add remaining params as query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, any>;
        const errorBody: ErrorBody = {
          message: typeof errorData.message === 'string' ? errorData.message : 'Unknown error',
          code: typeof errorData.code === 'string' ? errorData.code : undefined,
          details: typeof errorData.details === 'object' ? errorData.details : undefined
        };
        throw new ApiError(response.status, errorBody);
      }

      if (response.status === 204) {
        return new ApiResult<T>(response.status, undefined as T);
      }

      const responseData = await response.json() as T;
      return new ApiResult(response.status, responseData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, { message: 'Network error' });
    }
  }
}`;

  writeFileSync(join(OUTPUT_DIR, 'BaseClient.ts'), content);
}

function generateApiError(): void {
  // Generate ErrorBody interface
  const errorBodyContent = `export interface ErrorBody {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}`;
  writeFileSync(join(OUTPUT_DIR, 'core', 'ErrorBody.ts'), errorBodyContent);

  // Generate ApiError class with import
  const apiErrorContent = `import { ErrorBody } from './ErrorBody';

export class ApiError extends Error {
  constructor(public status: number, public body: ErrorBody) {
    super(\`API Error \${status}: \${JSON.stringify(body)}\`);
    this.name = 'ApiError';
  }
}`;

  writeFileSync(join(OUTPUT_DIR, 'core', 'ApiError.ts'), apiErrorContent);
}

function generateApiClients(paths: { [key: string]: PathItem }): void {
  // Group endpoints by tag/resource
  const resources = new Map<string, { path: string; method: string; operation: OperationObject }[]>();

  Object.entries(paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem as Record<string, unknown>).forEach(([method, operation]) => {
      if (method === 'parameters') return;
      if (!isOperationObject(operation)) return;

      const resourceName = getResourceFromPath(path);
      if (!resources.has(resourceName)) {
        resources.set(resourceName, []);
      }
      resources.get(resourceName)?.push({ path, method, operation });
    });
  });

  // Generate a client class for each resource
  resources.forEach((endpoints, resourceName) => {
    const className = getClientClassName(resourceName);
    const content = generateResourceClient(className, endpoints);
    writeFileSync(join(OUTPUT_DIR, `${className}.ts`), content);
  });

  // Generate index file
  generateIndex(Array.from(resources.keys()));
}

function isOperationObject(obj: unknown): obj is OperationObject {
  return typeof obj === 'object' && obj !== null && 'responses' in obj;
}

function getClientClassName(resource: string): string {
  // Already in PascalCase, just append Client
  return `${resource}Client`;
}

function generateResourceClient(
  className: string,
  endpoints: { path: string; method: string; operation: OperationObject }[]
): string {
  // Track used method names to avoid duplicates
  const usedMethodNames = new Set<string>();

  const methods = endpoints.map(({ path, method, operation }) => {
    // Use operationId directly if available
    let methodName = operation.operationId || getMethodName(path, method);
    
    // Handle case where operationId is different than expected method name pattern
    // This is especially for WebhooksClient and similar clients
    if (!operation.operationId) {
      // Only apply transformations if we're using a generated method name
      methodName = methodName.charAt(0).toLowerCase() + methodName.slice(1);
    }
    
    // If duplicate method name, add numeric suffix
    if (usedMethodNames.has(methodName)) {
      let counter = 2;
      let newMethodName = `${methodName}${counter}`;
      while (usedMethodNames.has(newMethodName)) {
        counter++;
        newMethodName = `${methodName}${counter}`;
      }
      methodName = newMethodName;
    }
    
    usedMethodNames.add(methodName);
    
    // Generate method documentation
    const doc = generateMethodDocumentation(operation);
    
    // Generate method parameters
    const params = getMethodParameters(path, operation);
    
    // Generate method return type
    const returnType = getReturnType(operation);
    
    // Generate method body
    const options = getRequestOptions(path, operation);
    
    return `${doc}  public async ${methodName}(${params}): Promise<ApiResult<${returnType}>> {
    return this.request({
      method: '${method.toUpperCase()}',
      path: '${path}'${options ? `,\n      ${options}` : ''}
    });
  }`;
  });
  
  return `import { BaseClient } from './BaseClient';
import { ApiResult } from './core/ApiResult';
import * as Types from '../types/api';

export class ${className} extends BaseClient {
${methods.join('\n\n')}
}`;
}

function generateIndex(resources: string[]): string {
  const content = `${resources
    .map((resource) => {
      // Convert kebab-case to PascalCase for the client class name
      const clientName = getClientClassName(resource);
      return `export * from './${clientName}';`;
    })
    .join('\n')}
export * from './BaseClient';
export * from './core/ApiError';
export * from './core/ApiResult';
export * from './core/ApiRequestOptions';`;

  writeFileSync(join(OUTPUT_DIR, 'index.ts'), content);
  return content;
}

function generateTypes(): void {
  // Generate core types
  const types: Record<string, string> = {
    ApiError: `import { ErrorBody } from './ErrorBody';

export class ApiError extends Error {
  constructor(public status: number, public body: ErrorBody) {
    super(\`API Error \${status}: \${JSON.stringify(body)}\`);
    this.name = 'ApiError';
  }
}`,
    ApiResult: `export class ApiResult<T> {
  constructor(public status: number, public data: T) {}
}`,
    ApiRequestOptions: `export interface ApiRequestOptions {
  method: string;
  path: string;
  params?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
}`,
  };

  // Create core directory
  const coreDir = join(OUTPUT_DIR, 'core');
  if (!existsSync(coreDir)) {
    mkdirSync(coreDir, { recursive: true });
  }

  // Write core type files
  Object.entries(types).forEach(([name, content]) => {
    writeFileSync(join(coreDir, `${name}.ts`), content);
  });
}

function getResourceFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // Convert kebab-case to PascalCase
  return parts[0].split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMethodName(path: string, method: string): string {
  const parts = path.split('/').filter(Boolean);
  
  if (method === 'get') {
    // If the path has a query parameter for ID, use 'get'
    if (parts.length === 1) return 'list';
    if (parts[parts.length - 1].includes('{')) return 'get';
    return 'list';
  }
  if (method === 'post') return 'create';
  if (method === 'put') return 'update';
  if (method === 'delete') return 'delete';
  if (method === 'patch') return 'patch';
  
  return method;
}

function getMethodParameters(path: string, operation: OperationObject): string {
  const params: string[] = [];
  const optionalQueryParams: string[] = [];

  // 1. Path parameters (always first and required)
  const pathParams = operation.parameters?.filter(p => p.in === 'path') || [];
  pathParams.forEach(param => {
    params.push(`${param.name}: string`);
  });

  // 2. Required Query parameters (as individual required parameters)
  const requiredQueryParams = operation.parameters?.filter(p => p.in === 'query' && p.required) || [];
  requiredQueryParams.forEach(param => {
    // Assuming required query parameters are strings
    params.push(`${param.name}: string`); 
  });

  // 3. Request body (if present)
  if (operation.requestBody) {
    const schema = operation.requestBody.content['application/json'].schema;
    const type = getSchemaType(schema);
    // We determine if data is truly optional based on requestBody.required
    const isDataOptional = !(operation.requestBody as any).required; // Check the required flag
    params.push(`data${isDataOptional ? '?' : ''}: ${type}`); 
  }

  // 4. Optional Query parameters (grouped into a single optional object)
  const optionalQueryParamObjects = operation.parameters?.filter(p => p.in === 'query' && !p.required) || [];
  if (optionalQueryParamObjects.length > 0) {
    const optionalParamsString = optionalQueryParamObjects
      .map(p => `${p.name}?: string`) // Assuming optional query params are strings
      .join(', ');
    // This must come *last* if data is required, or after required params if data is optional/absent
    params.push(`optionalParams?: { ${optionalParamsString} }`);
  }

  return params.join(', ');
}

function getReturnType(operation: OperationObject): string {
  const successResponse = operation.responses['200'] || operation.responses['201'];
  if (!successResponse?.content) return 'void';

  const schema = successResponse.content['application/json'].schema;
  return getSchemaType(schema);
}

function getSchemaType(schema: SchemaObject): string {
  if (schema.$ref) {
    return `Types.${schema.$ref.split('/').pop() || 'unknown'}`;
  }

  if (schema.type === 'array' && schema.items) {
    return `${getSchemaType(schema.items)}[]`;
  }

  return 'Record<string, unknown>';
}

function getRequestOptions(path: string, operation: OperationObject): string {
  const options: string[] = [];
  const allParams: string[] = [];

  // Path parameters
  const pathParams = operation.parameters?.filter(p => p.in === 'path') || [];
  pathParams.forEach(p => allParams.push(`${p.name}: ${p.name}`));

  // Required Query parameters
  const requiredQueryParams = operation.parameters?.filter(p => p.in === 'query' && p.required) || [];
  requiredQueryParams.forEach(p => allParams.push(`${p.name}: ${p.name}`));

  // Optional Query parameters (add from the optionalParams object)
  const optionalQueryParamObjects = operation.parameters?.filter(p => p.in === 'query' && !p.required) || [];
  if (optionalQueryParamObjects.length > 0) {
    // Spread the optionalParams object if it exists and is provided
    allParams.push('...optionalParams'); 
  }

  if (allParams.length > 0) {
    // Filter out undefined values that might come from spreading optionalParams when it's not provided
    // This filtering happens implicitly when the object is constructed in the actual call.
    options.push(`params: { ${allParams.join(', ')} }`);
  }

  // Request body
  if (operation.requestBody) {
    options.push('data');
  }

  return options.join(',\n      ');
}

function generateMethodDocumentation(operation: OperationObject): string {
  const lines = ['/**'];
  if (operation.summary) lines.push(` * ${operation.summary}`);
  if (operation.description) lines.push(` * ${operation.description}`);
  lines.push(' */');
  return lines.join('\n');
}

generateClient(); 