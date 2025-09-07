import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const logo = (
  <>
    <Image
      src="/lomi_d.webp"
      alt="lomi."
      width="60"
      height="18"
      className="block dark:hidden"
    />
    <Image
      src="/lomi_l.webp"
      alt="lomi."
      width="60"
      height="18"
      className="hidden dark:block"
    />
  </>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const linkItems: any[] = [];

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: logo,
    },
    // see https://developers.lomi.africa/docs/ui/navigation/links
    links: linkItems,
  };
}
