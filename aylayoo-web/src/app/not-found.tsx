'use client';

import Link from 'next/link';
import { LangProvider, useLang } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { DetailChrome } from './components/DetailChrome';

/* Shown for an unknown route, and for a detail page whose id or slug matched nothing — the pages
 * call notFound() rather than rendering an empty shell. The metadata for those cases is set by
 * each page's generateMetadata (notFoundMetadata in lib/seo.ts), which also marks them noindex. */

function Body() {
  const { t } = useLang();

  return (
    <DetailChrome
      crumbs={[{ label: t('Нүүр'), href: '/' }, { label: t('Хуудас олдсонгүй') }]}
    >
      <article className="d-card">
        <h1>{t('Хуудас олдсонгүй')}</h1>
        <p className="d-lede">{t('Хайсан хуудас байхгүй, эсвэл хаяг нь өөрчлөгдсөн байна.')}</p>
        <Link className="btn btn-primary" href="/">{t('Нүүр хуудас руу буцах')}</Link>
      </article>
    </DetailChrome>
  );
}

export default function NotFound() {
  return (
    <LangProvider titles={{ mn: pageTitle('Хуудас олдсонгүй'), en: 'Page not found | AYLAYOO' }}>
      <Body />
    </LangProvider>
  );
}
