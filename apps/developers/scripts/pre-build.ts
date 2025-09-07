import { buildRegistry } from '@/scripts/build-registry';
import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';
import { openapi } from '@/lib/openapi';

export async function generateDocs() {
  await rimraf('./content/docs/openapi/(generated)');

  await Promise.all([
    OpenAPI.generateFiles({
      input: openapi,
      output: './content/docs/openapi/(generated)',
      per: 'operation',
      includeDescription: true,
    }),
  ]);
}

async function main() {
  // Run registry build with error handling
  try {
    await buildRegistry();
  } catch (error) {
    console.warn('Registry build failed, but continuing with docs generation:', error instanceof Error ? error.message : String(error));
  }

  // Generate docs
  await generateDocs();
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
  process.exit(1);
});
