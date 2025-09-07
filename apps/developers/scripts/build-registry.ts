import {
  build,
  writeFumadocsRegistry,
  writeShadcnRegistry,
} from '@fumadocs/cli/build';
import { registry } from '@/components/registry.mjs';

export async function buildRegistry() {
  const mainRegistry = await build(registry);

  await Promise.all([
    writeFumadocsRegistry(mainRegistry, {
      dir: 'public/registry',
    }),
    writeShadcnRegistry(mainRegistry, {
      dir: 'public/r',
      baseUrl: 'https://fumadocs.dev',
    }),
  ]);
}
