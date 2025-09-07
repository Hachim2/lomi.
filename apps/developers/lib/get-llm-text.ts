import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { remarkInclude } from 'fumadocs-mdx/config';
import { type Page } from '@/lib/source';
import { remarkNpm } from 'fumadocs-core/mdx-plugins';
import fs from 'node:fs/promises';

const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkGfm)
  .use(remarkAutoTypeTable)
  .use(remarkNpm);

export async function getLLMText(page: Page) {
  const category =
    {
      ui: 'lomi. Framework',
      headless: 'lomi. Core (core library of framework)',
      mdx: 'lomi. MDX (the built-in content source)',
      cli: 'lomi. CLI (the CLI tool for automating lomi. apps)',
    }[page.slugs[0]] ?? page.slugs[0];

  const processed = await processor.process({
    path: page.absolutePath,
    value: await fs.readFile(page.absolutePath),
  });

  return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/lomiafrica/developers.lomi.africa/refs/heads/main/content/docs/${page.path}

${page.data.description}
        
${processed.value}`;
}