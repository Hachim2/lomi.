import type { Metadata } from 'next/types';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://docs.lomi.africa',
      images: '/banner.webp',
      siteName: 'lomi. / docs',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@money_is_shark',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/banner.webp',
      ...override.twitter,
    },
    alternates: {
      types: {
        'application/rss+xml': [
          {
            title: 'lomi. / blog',
            url: 'https://lomi.africa/blog',
          },
        ],
      },
      ...override.alternates,
    },
  };
}

export const baseUrl =
  process.env.NODE_ENV === 'development' ||
  !process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL('http://localhost:3000')
    : new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
