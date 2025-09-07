import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export const revalidate = false;

// Use the correct production domain for sitemap
const getSitemapBaseUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  // Always use the custom domain for production sitemap
  return 'https://docs.lomi.africa';
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapBaseUrl = getSitemapBaseUrl();
  const url = (path: string): string => new URL(path, sitemapBaseUrl).toString();

  return [
    {
      url: url('/'),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: url('/showcase'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/docs'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...source.getPages().map((page) => {
      const { lastModified } = page.data;

      return {
        url: url(page.url),
        lastModified: lastModified ? new Date(lastModified) : undefined,
        changeFrequency: 'weekly',
        priority: 0.5,
      } as MetadataRoute.Sitemap[number];
    }),
  ];
}
