import { type Registry } from '@fumadocs/cli/build';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');

function selectFrom(r: Registry, component: string, filename: string) {
  const comp = r.components.find((comp) => comp.name === component)!;

  return {
    component: comp,
    file: comp.files.find((file) => path.basename(file.path) === filename)!,
  };
}

export const registry: Registry = {
  dir: baseDir,
  name: 'lomi. / docs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // source object is external
    if (filePath === 'lib/source.ts') return undefined;

    // ignore all node_modules files
    if (absolutePath.includes('node_modules')) return undefined;

    // ignore TypeScript declaration files anywhere
    if (absolutePath.includes('.d.ts')) return undefined;

    // allow specific lib files that are used by components
    if (filePath === 'lib/cn.ts') {
      return {
        type: 'lib',
        path: 'lib/cn.ts',
      };
    }

    // ignore other internal lib files
    if (filePath.startsWith('lib/')) return undefined;

    // for any other unknown files, return undefined to ignore them
    return undefined;
  },
  onResolve(ref) {
    // No external UI registry to resolve from
    return ref;
  },
  components: [
    {
      name: 'graph-view',
      description: 'A graph to display relationships of all pages',
      files: [
        {
          type: 'components',
          path: 'components/graph-view.tsx',
        },
      ],
    },
    {
      name: 'feedback',
      title: 'Feedback',
      description: 'Component to send user feedbacks about the docs',
      files: [
        {
          type: 'components',
          path: 'components/feedback.tsx',
        },
      ],
    },
    {
      name: 'ai/search',
      title: 'AI Search (Next.js Only)',
      description:
        'Ask AI dialog for your docs, you need to configure Inkeep first',
      files: [
        {
          type: 'components',
          path: 'components/ai/index.tsx',
        },
        {
          type: 'components',
          path: 'components/ai/search.tsx',
        },
        {
          type: 'components',
          path: 'components/ai/markdown.tsx',
        },
        {
          type: 'route',
          path: 'app/api/chat/route.ts',
          target: 'app/api/chat/route.ts',
        },
        {
          type: 'lib',
          path: 'lib/chat/inkeep-qa-schema.ts',
        },
      ],
    },
    {
      name: 'ai/page-actions',
      title: 'AI Page Actions',
      description: 'Common page actions for AI',
      files: [
        {
          type: 'components',
          path: 'components/ai/page-actions.tsx',
        },
      ],
    },
    {
      name: 'og/mono',
      description: 'Open graph image generation (mono-style)',
      files: [
        {
          type: 'lib',
          path: 'lib/og/mono.tsx',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Bold.ttf',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Regular.ttf',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    next: null,
    react: null,
  },
};
