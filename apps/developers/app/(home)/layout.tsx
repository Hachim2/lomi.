import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import type { ReactNode } from 'react';

interface LayoutProps<T extends string> {
  children: ReactNode;
  params: Promise<{ slug?: T[] }>;
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
