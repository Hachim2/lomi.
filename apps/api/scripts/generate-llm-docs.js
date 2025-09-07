const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

function generateMarkdown(spec) {
    let markdown = `# ${spec.info.title} v${spec.info.version}\n\n`;

    // Add description
    markdown += `${spec.info.description}\n\n`;

    // Add base URL
    markdown += `## Base URL\n\n`;
    spec.servers.forEach(server => {
        markdown += `- ${server.url}\n`;
    });
    markdown += '\n';

    // Add authentication
    markdown += `## Authentication\n\n`;
    if (spec.components?.securitySchemes?.ApiKeyAuth) {
        const auth = spec.components.securitySchemes.ApiKeyAuth;
        markdown += `Authentication type: ${auth.type}\n`;
        markdown += `Header name: ${auth.name}\n`;
        markdown += `Location: ${auth.in}\n\n`;
    }

    // Add endpoints
    markdown += `## Endpoints\n\n`;
    Object.entries(spec.paths).forEach(([path, methods]) => {
        markdown += `### ${path}\n\n`;

        Object.entries(methods).forEach(([method, details]) => {
            markdown += `#### ${method.toUpperCase()}\n\n`;
            markdown += `Summary: ${details.summary}\n`;
            if (details.description) markdown += `Description: ${details.description}\n`;

            // Parameters
            if (details.parameters?.length) {
                markdown += `\nParameters:\n`;
                details.parameters.forEach(param => {
                    markdown += `- ${param.name} (${param.in}) - ${param.required ? 'Required' : 'Optional'}: ${param.description}\n`;
                });
            }

            // Request body
            if (details.requestBody) {
                markdown += `\nRequest Body:\n\`\`\`yaml\n${yaml.dump(details.requestBody.content['application/json'].schema)}\n\`\`\`\n`;
            }

            // Responses
            markdown += `\nResponses:\n`;
            Object.entries(details.responses).forEach(([code, response]) => {
                markdown += `- ${code}: ${response.description}\n`;
                if (response.content?.['application/json']?.schema) {
                    markdown += `  Schema:\n\`\`\`yaml\n${yaml.dump(response.content['application/json'].schema)}\n\`\`\`\n`;
                }
            });

            markdown += '\n---\n\n';
        });
    });

    // Add schemas
    markdown += `## Data Models\n\n`;
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
        markdown += `### ${name}\n\n\`\`\`yaml\n${yaml.dump(schema)}\n\`\`\`\n\n`;
    });

    return markdown;
}

// Load OpenAPI spec
const specPath = path.join(__dirname, '../openapi/spec.yaml');
const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));

// Generate markdown
const markdown = generateMarkdown(spec);

// Write to file
const outputPath = path.join(__dirname, '../docs/llm.txt');
fs.writeFileSync(outputPath, markdown);

console.log('LLM-friendly documentation generated successfully!'); 