import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentProps, type FC, type ReactNode, type JSX } from 'react';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import * as Preview from '@/components/preview';
import { createMetadata } from '@/lib/metadata';
import { source } from '@/lib/source';
import { Wrapper } from '@/components/preview/wrapper';
import { Mermaid } from '@/components/mdx/mermaid';
import { getMDXComponents } from '@/mdx-components';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import Link from 'fumadocs-core/link';
import { AutoTypeTable } from 'fumadocs-typescript/ui';
import { createGenerator } from 'fumadocs-typescript';
import { getPageTreePeers } from 'fumadocs-core/server';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { APIPage } from 'fumadocs-openapi/ui';
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions';
import * as path from 'node:path';
import { Banner } from 'fumadocs-ui/components/banner';
import { Installation } from '@/components/preview/installation';
import { Customisation } from '@/components/preview/customisation';
import { DocsPage } from 'fumadocs-ui/page';

function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
}

const generator = createGenerator();

export const revalidate = false;

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const page = source.getPage(resolvedParams.slug);

  if (!page) notFound();

  const preview = page.data.preview;
  const { body: Mdx, toc, lastModified } = page.data;

  return (
    <DocsPage
      toc={toc}
      lastUpdate={lastModified ? new Date(lastModified) : undefined}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
      <p className="text-lg text-fd-muted-foreground">
        {page.data.description}
      </p>
      <div className="flex flex-row gap-2 items-center border-b -translate-y-4 pt-3 pb-6 justify-end">
        <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
        <ViewOptions
          markdownUrl={`${page.url}.mdx`}
          githubUrl={`https://github.com/babacar/developers/blob/main/content/docs/${page.path}`}
        />
      </div>
      <div className="prose flex-1 text-fd-foreground/80">
        {preview ? <PreviewRenderer preview={preview} /> : null}
        <Mdx
          components={getMDXComponents({
            ...Twoslash,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            a: ({ href, ...props }: any): JSX.Element => {
              const found = source.getPageByHref(href ?? '', {
                dir: path.dirname(page.path),
              });

              if (!found) return <Link href={href} {...props} />;

              return (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Link
                      href={
                        found.hash
                          ? `${found.page.url}#${found.hash}`
                          : found.page.url
                      }
                      {...props}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="text-sm">
                    <p className="font-medium">{found.page.data.title}</p>
                    <p className="text-fd-muted-foreground">
                      {found.page.data.description}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              );
            },
            Banner,
            Mermaid,
            TypeTable,
            AutoTypeTable: (props) => (
              <AutoTypeTable generator={generator} {...props} />
            ),
            Wrapper,
            blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            APIPage: (props: any): JSX.Element => <APIPage {...props} />,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            DocsCategory: ({ url }: any): JSX.Element => {
              return <DocsCategory url={url ?? page.url} />;
            },
            Installation,
            Customisation,
          })}
        />
        {page.data.index ? <DocsCategory url={page.url} /> : null}
      </div>
    </DocsPage>
  );
}

function DocsCategory({ url }: { url: string }) {
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, url).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const page = source.getPage(resolvedParams.slug);
  if (!page) notFound();

  const description =
    page.data.description ?? 'The library for building documentation sites';

  const image = {
    url: ['/og', ...(resolvedParams.slug || []), 'image.png'].join('/'),
    width: 1200,
    height: 630,
  };

  return createMetadata({
    title: page.data.title,
    description,
    openGraph: {
      url: `/docs/${page.slugs.join('/')}`,
      images: [image],
    },
    twitter: {
      images: [image],
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
