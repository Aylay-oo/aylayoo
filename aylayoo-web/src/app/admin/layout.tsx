import type { Metadata } from 'next';

/* Kept out of search results. The page is not linked from anywhere on the public site, but
 * "not linked" and "not indexed" are different things, and a crawler that finds it some other
 * way should not put a login form for this site into a search engine. */
export const metadata: Metadata = {
  title: 'Админ | АЯЛЪЯ ӨӨ',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
