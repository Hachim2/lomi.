import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TextRun,
  AlignmentType,
  PageBreak,
  IBordersOptions,
  BorderStyle,
  VerticalAlign,
  ISectionOptions,
  ShadingType,
  convertInchesToTwip,
} from 'docx';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// Helper interfaces for OpenAPI spec structure (simplified)
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{ url: string; description?: string }>;
  components: {
    schemas: { [key: string]: any };
    securitySchemes?: { [key: string]: any };
    responses?: { [key: string]: any };
  };
  paths: {
    [path: string]: {
      [method: string]: PathItemObject;
    };
  };
  security?: Array<{ [key: string]: string[] }>;
  tags?: Array<{ name: string; description?: string }>;
}

interface PathItemObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: {
    [statusCode: string]: ResponseObject;
  };
  security?: Array<{ [key: string]: string[] }>;
}

interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
}

interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: {
    [mediaType: string]: {
      schema?: SchemaObject;
    };
  };
}

interface ResponseObject {
  description: string;
  content?: {
    [mediaType: string]: {
      schema?: SchemaObject;
    };
  };
  headers?: {
    [headerName: string]: any; // Simplified
  };
  links?: {
    [linkName: string]: any; // Simplified
  };
}

interface SchemaObject {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  description?: string;
  properties?: { [key: string]: SchemaObject };
  required?: string[];
  items?: SchemaObject;
  enum?: any[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  $ref?: string;
  // Allow any other properties
  [key: string]: any;
}

// Styling Constants
const HEADING_BLUE_COLOR = "2E74B5"; // A professional blue
const TABLE_HEADER_SHADING_COLOR = "BFBFBF"; // Light grey for table headers
const DOCUMENT_TITLE_SIZE = 48; // 24pt (docx points are half of actual points)
const H1_SIZE = 32; // 16pt
const H2_SIZE = 28; // 14pt
const H3_SIZE = 24; // 12pt (will be bold)
const NORMAL_TEXT_SIZE = 22; // 11pt

const NO_BORDER: IBordersOptions = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

// Helper for creating styled paragraphs in table cells
function createTableCellParagraph(text: string, bold: boolean = false, isHeader: boolean = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: NORMAL_TEXT_SIZE })],
    alignment: AlignmentType.CENTER, // Center horizontally
    spacing: { before: 60, after: 60 },
  });
}

function createSectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: H1_SIZE, color: HEADING_BLUE_COLOR })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) },
  });
}

function createSubTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: H2_SIZE, color: HEADING_BLUE_COLOR })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: convertInchesToTwip(0.15), after: convertInchesToTwip(0.08) },
  });
}

function createNormalParagraph(text: string): Paragraph {
  return new Paragraph({ 
    children: [new TextRun({ text, size: NORMAL_TEXT_SIZE })],
    spacing: { after: convertInchesToTwip(0.05) }
  });
}

function getSchemaNameFromRef(ref?: string): string | undefined {
  if (!ref) return undefined;
  return ref.startsWith('#/components/schemas/') ? ref.substring('#/components/schemas/'.length) : ref;
}

function getSchemaType(schema?: SchemaObject): string {
  if (!schema) return 'any';
  if (schema.$ref) return getSchemaNameFromRef(schema.$ref) || 'any';
  if (schema.type === 'array' && schema.items) {
    return `array of ${getSchemaType(schema.items)}`;
  }
  if (schema.type === 'object' && schema.title) return schema.title;
  return schema.format ? `${schema.type} (${schema.format})` : schema.type || 'any';
}

function addIntroduction(spec: OpenAPISpec): ISectionOptions {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: spec.info.title, bold: true, size: DOCUMENT_TITLE_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(0.3) }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Version: ${spec.info.version}`, size: NORMAL_TEXT_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(0.3) }
    }),
    createSectionTitle("Introduction"),
    createNormalParagraph(spec.info.description || "This document describes the API structure and endpoints."),
    createSubTitle("Base URLs"),
    ...spec.servers.map(server => createNormalParagraph(`${server.url}${server.description ? ` (${server.description})` : ''}`)),
  ];
  return { children };
}

function addAuthentication(spec: OpenAPISpec): ISectionOptions {
  const children: Paragraph[] = [createSectionTitle("Authentication")];
  if (spec.components.securitySchemes) {
    for (const schemeName in spec.components.securitySchemes) {
      const scheme = spec.components.securitySchemes[schemeName];
      children.push(createSubTitle(schemeName));
      children.push(createNormalParagraph(`Type: ${scheme.type}`));
      if (scheme.type === 'apiKey') {
        children.push(createNormalParagraph(`In: ${scheme.in}`));
        children.push(createNormalParagraph(`Name: ${scheme.name}`));
      } else if (scheme.type === 'http' && scheme.scheme) {
         children.push(createNormalParagraph(`Scheme: ${scheme.scheme}`));
         if(scheme.bearerFormat) children.push(createNormalParagraph(`Bearer Format: ${scheme.bearerFormat}`));
      }
      if (scheme.description) {
        children.push(createNormalParagraph(scheme.description || ''));
      } else {
        children.push(createNormalParagraph(''));
      }
    }
  } else {
    children.push(createNormalParagraph("No security schemes defined in the specification."));
  }
  if (spec.security) {
     children.push(createSubTitle("Global Security Requirements"));
     spec.security.forEach(secReq => {
        Object.keys(secReq).forEach(key => {
            children.push(createNormalParagraph(`Scheme: ${key} (Scopes: ${secReq[key].join(', ') || 'none'})`));
        });
     });
  }
  return { children };
}

function addEndpoints(spec: OpenAPISpec): ISectionOptions {
  const children: (Paragraph | Table)[] = [createSectionTitle("API Endpoints")];

  for (const apiPath in spec.paths) {
    children.push(new Paragraph({
        children: [new TextRun({ text: apiPath, bold: true, size: H2_SIZE, color: HEADING_BLUE_COLOR })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }));
    const pathObject = spec.paths[apiPath];
    for (const method in pathObject) {
      const endpoint = pathObject[method as keyof typeof pathObject] as PathItemObject;
      children.push(new Paragraph({
        children: [new TextRun({ text: `${method.toUpperCase()}`, bold: true, size: H3_SIZE })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: convertInchesToTwip(0.1), after: convertInchesToTwip(0.05) }
      }));

      if (endpoint.summary) children.push(createNormalParagraph(`Summary: ${endpoint.summary}`));
      if (endpoint.description) children.push(createNormalParagraph(`Description: ${endpoint.description}`));
      if (endpoint.operationId) children.push(createNormalParagraph(`Operation ID: ${endpoint.operationId}`));
      if (endpoint.tags) children.push(createNormalParagraph(`Tags: ${endpoint.tags.join(', ')}`));


      if (endpoint.parameters && endpoint.parameters.length > 0) {
        children.push(new Paragraph({ 
            children: [new TextRun({ text: "Parameters:", bold: true, size: NORMAL_TEXT_SIZE })],
            spacing: { before: convertInchesToTwip(0.08), after: convertInchesToTwip(0.05) }
        }));
        const paramHeaderCell = (text: string) => new TableCell({
            children: [createTableCellParagraph(text, true, true)],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: TABLE_HEADER_SHADING_COLOR, type: ShadingType.SOLID, color: "auto" },
        });
        const paramRows = [
          new TableRow({
            children: [
              paramHeaderCell("Name"),
              paramHeaderCell("In"),
              paramHeaderCell("Required"),
              paramHeaderCell("Type"),
              paramHeaderCell("Description"),
            ],
            tableHeader: true,
          })
        ];
        endpoint.parameters.forEach(param => {
          paramRows.push(new TableRow({
            children: [
              new TableCell({ children: [createTableCellParagraph(param.name)], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [createTableCellParagraph(param.in)], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [createTableCellParagraph(param.required ? 'Yes' : 'No')], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [createTableCellParagraph(getSchemaType(param.schema))], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [createTableCellParagraph(param.description || '')], verticalAlign: VerticalAlign.CENTER }),
            ],
          }));
        });
        children.push(new Table({ 
            rows: paramRows, 
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [2000, 1000, 1000, 2000, 3600],
        }));
      }

      if (endpoint.requestBody) {
        children.push(new Paragraph({ 
            children: [new TextRun({text: "Request Body:", bold: true, size: NORMAL_TEXT_SIZE})],
            spacing: { before: convertInchesToTwip(0.08), after: convertInchesToTwip(0.05) }
        }));
        if (endpoint.requestBody.description) children.push(createNormalParagraph(endpoint.requestBody.description));
        if (endpoint.requestBody.required) children.push(createNormalParagraph("Required: Yes"));
        for (const mediaType in endpoint.requestBody.content) {
          const schema = endpoint.requestBody.content[mediaType]?.schema;
          const schemaName = getSchemaNameFromRef(schema?.$ref);
          children.push(createNormalParagraph(`Content-Type: ${mediaType}`));
          if (schemaName) {
            children.push(createNormalParagraph(`Schema: See '${schemaName}' in Data Models section.`));
          } else if (schema) {
            children.push(createNormalParagraph(`Schema Type: ${getSchemaType(schema)}`));
          }
        }
      }

      children.push(new Paragraph({ 
          children: [new TextRun({text: "Responses:", bold: true, size: NORMAL_TEXT_SIZE})],
          spacing: { before: convertInchesToTwip(0.08), after: convertInchesToTwip(0.05) }
      }));
      const responseHeaderCell = (text: string) => new TableCell({
        children: [createTableCellParagraph(text, true, true)],
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: TABLE_HEADER_SHADING_COLOR, type: ShadingType.SOLID, color: "auto" },
      });
      const responseRows = [
        new TableRow({
          children: [
            responseHeaderCell("Status Code"),
            responseHeaderCell("Description"),
            responseHeaderCell("Schema"),
          ],
          tableHeader: true,
        })
      ];
      for (const statusCode in endpoint.responses) {
        const response = endpoint.responses[statusCode];
        let schemaInfo = 'N/A';
        if (response.content) {
          for (const mediaType in response.content) {
            const schema = response.content[mediaType]?.schema;
            const schemaName = getSchemaNameFromRef(schema?.$ref);
            if (schemaName) {
              schemaInfo = `See '${schemaName}' in Data Models section.`;
            } else if (schema) {
              schemaInfo = getSchemaType(schema);
            }
            break; 
          }
        }
        responseRows.push(new TableRow({
          children: [
            new TableCell({ children: [createTableCellParagraph(statusCode)], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [createTableCellParagraph(response.description || '')], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [createTableCellParagraph(schemaInfo || '')], verticalAlign: VerticalAlign.CENTER }),
          ],
        }));
      }
      children.push(new Table({ 
          rows: responseRows, 
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [1500, 5500, 2600],
      }));
      children.push(new Paragraph({ text: '', spacing: { after: convertInchesToTwip(0.1) } })); // spacer
    }
  }
  return { children };
}


function processSchemaProperties(schema: SchemaObject, spec: OpenAPISpec, pathPrefix: string = ''): TableRow[] {
  const rows: TableRow[] = [];
  const properties = schema.properties || (schema.allOf ? schema.allOf.reduce((acc, s) => ({...acc, ...resolveSchema(s, spec).properties}), {}) : {});

  for (const propName in properties) {
    const propSchema = resolveSchema(properties[propName], spec);
    const propType = getSchemaType(propSchema);
    const isRequired = schema.required?.includes(propName) || false;

    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(pathPrefix + propName)] }),
        new TableCell({ children: [new Paragraph(propType)] }),
        new TableCell({ children: [new Paragraph(isRequired ? 'Yes' : 'No')] }),
        new TableCell({ children: [new Paragraph(propSchema.description || '')] }),
      ],
    }));

    if (propSchema.type === 'object' && propSchema.properties && !propSchema.$ref) { // Nested object, not a $ref
        rows.push(...processSchemaProperties(propSchema, spec, `${pathPrefix}${propName}.`));
    } else if (propSchema.type === 'array' && propSchema.items) {
        const itemSchema = resolveSchema(propSchema.items, spec);
        if (itemSchema.type === 'object' && itemSchema.properties && !itemSchema.$ref) {
            rows.push(...processSchemaProperties(itemSchema, spec, `${pathPrefix}${propName}[].`));
        }
    }
  }
  return rows;
}


function resolveSchema(schema: SchemaObject, spec: OpenAPISpec): SchemaObject {
    if (schema.$ref) {
        const refName = getSchemaNameFromRef(schema.$ref);
        if (refName && spec.components.schemas[refName]) {
            // Merge $ref schema with any properties defined alongside $ref (OpenAPI 3.0.x)
            const { $ref, ...otherProps } = schema;
            return { ...resolveSchema(spec.components.schemas[refName], spec), ...otherProps };
        }
    }
    if (schema.allOf) {
        let combinedSchema: any = { properties: {}, required: [] };
        schema.allOf.forEach(subSchema => {
            const resolvedSubSchema = resolveSchema(subSchema, spec);
            if (resolvedSubSchema.properties) {
                combinedSchema.properties = { ...combinedSchema.properties, ...resolvedSubSchema.properties };
            }
            if (resolvedSubSchema.required) {
                combinedSchema.required = [...new Set([...combinedSchema.required, ...resolvedSubSchema.required])];
            }
            // Merge other top-level properties, 'properties' and 'required' are handled above
            const { properties, required, ...otherSubProps } = resolvedSubSchema;
            combinedSchema = { ...combinedSchema, ...otherSubProps };
        });
        // Remove allOf after processing to avoid infinite loops
        const { allOf, ...restOfOriginalSchema } = schema;
        return { ...combinedSchema, ...restOfOriginalSchema };
    }
    return schema;
}


function addDataModels(spec: OpenAPISpec): ISectionOptions {
  const children: (Paragraph | Table)[] = [createSectionTitle("Data Models (Schemas)")];

  for (const schemaName in spec.components.schemas) {
    children.push(new Paragraph({ 
        children: [new TextRun({ text: schemaName, bold: true, size: H2_SIZE, color: HEADING_BLUE_COLOR })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) } 
    }));
    const originalSchema = spec.components.schemas[schemaName];
    const schema = resolveSchema(originalSchema, spec); 

    if (schema.description) {
      children.push(createNormalParagraph(schema.description));
    }

    if (schema.type === 'object' || schema.properties || schema.allOf) { 
      const propertyHeaderCell = (text: string) => new TableCell({
        children: [createTableCellParagraph(text, true, true)],
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: TABLE_HEADER_SHADING_COLOR, type: ShadingType.SOLID, color: "auto" },
      });
      const propertyRows = [
        new TableRow({
          children: [
            propertyHeaderCell("Property"),
            propertyHeaderCell("Type"),
            propertyHeaderCell("Required"),
            propertyHeaderCell("Description"),
          ],
          tableHeader: true,
        }),
        ...processSchemaProperties(schema, spec)
      ];
      children.push(new Table({ 
          rows: propertyRows, 
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [3000, 2500, 1000, 3100],
      }));
    } else if (schema.enum) {
      children.push(new Paragraph({ 
          children: [new TextRun({text: "Possible values (Enum):", bold: true, size: NORMAL_TEXT_SIZE})],
          spacing: { after: convertInchesToTwip(0.05) } 
      }));
      schema.enum.forEach((enumVal: any) => {
        children.push(new Paragraph({ children: [new TextRun({text: `- ${enumVal}`, size: NORMAL_TEXT_SIZE})], bullet: { level: 0 } }));
      });
    } else if (schema.type) {
         children.push(createNormalParagraph(`Type: ${getSchemaType(schema)}`));
    }
    
    ['oneOf', 'anyOf'].forEach(combiner => {
        if (schema[combiner] && Array.isArray(schema[combiner])) {
            children.push(new Paragraph({ 
                children: [new TextRun({ text: `${combiner.charAt(0).toUpperCase() + combiner.slice(1)}:`, bold: true, size: NORMAL_TEXT_SIZE })],
                spacing: { before: convertInchesToTwip(0.08), after: convertInchesToTwip(0.05) } 
            }));
            schema[combiner].forEach((subSchema: SchemaObject, index: number) => {
                const resolvedSub = resolveSchema(subSchema, spec);
                const subSchemaName = getSchemaNameFromRef(resolvedSub.$ref);
                if (subSchemaName) {
                    children.push(createNormalParagraph(`Option ${index + 1}: See '${subSchemaName}'`));
                } else {
                    children.push(createNormalParagraph(`Option ${index + 1}: Type - ${getSchemaType(resolvedSub)}`));
                    if(resolvedSub.description) children.push(createNormalParagraph(`  Description: ${resolvedSub.description || ''}`));
                }
            });
        }
    });


    children.push(new Paragraph({ text: '', spacing: { after: convertInchesToTwip(0.1) } })); // spacer
  }
  return { children };
}

async function generateApiDocx(specPath: string, outputPath: string) {
  try {
    console.log(`Reading OpenAPI spec from: ${specPath}`);
    const specFile = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.load(specFile) as OpenAPISpec;
    console.log(`Successfully parsed OpenAPI spec: ${spec.info.title}`);

    const introSection = addIntroduction(spec);
    const authSection = addAuthentication(spec);
    const endpointsSection = addEndpoints(spec);
    const dataModelsSection = addDataModels(spec);

    const doc = new Document({
      creator: "API Documentation Generator Script",
      title: `${spec.info.title} - API Documentation`,
      description: `API Documentation for ${spec.info.title} version ${spec.info.version}`,
      sections: [
        introSection,
        authSection,
        endpointsSection,
        dataModelsSection,
      ],
    });

    // Potentially add a section for common responses if defined in spec.components.responses
    // This would also need to be refactored to return ISectionOptions if implemented

    const packer = new Packer();
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    console.log(`DOCX API documentation generated successfully at: ${outputPath}`);

  } catch (error) {
    console.error("Error generating API documentation:", error);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
  }
}

// --- Main Execution ---
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: ts-node generate-regulator-api-doc.ts <path_to_openapi_spec.yaml> <output_docx_path>");
    console.error("Example: ts-node scripts/generate-regulator-api-doc.ts openapi/spec.yaml ./api_documentation_for_regulator.docx");
    process.exit(1);
  }

  const specFilePath = path.resolve(args[0]);
  const outputDocxPath = path.resolve(args[1]);

  if (!fs.existsSync(specFilePath)) {
    console.error(`Error: OpenAPI spec file not found at ${specFilePath}`);
    process.exit(1);
  }
  
  const outputDir = path.dirname(outputDocxPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  await generateApiDocx(specFilePath, outputDocxPath);
}

main().catch(error => {
  console.error("Unhandled error in main execution:", error);
}); 