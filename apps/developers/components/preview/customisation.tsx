import { CodeBlock } from '@/components/code-block';

export function Customisation() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
      <p className="font-medium text-sm">Install via lomi. CLI</p>
      <p className="text-fd-muted-foreground text-sm">
        For faster set-up
      </p>
      <CodeBlock
        code="npx @lomi.cli@latest"
        lang="bash"
        wrapper={{
          className: 'my-0',
        }}
      />
    </div>
  );
}
