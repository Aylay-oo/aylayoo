'use client';

import Link from 'next/link';
import type { CityRouteItem } from '../../../../lib/api';
import { LangProvider, useLang } from '../../../../lib/i18n';
import { pageTitle } from '../../../../lib/seo';
import { DetailChrome } from '../../../components/DetailChrome';
import { StopList } from '../../../components/StopList';
import { StopMap } from '../../../components/StopMap';

function Body({ route }: { route: CityRouteItem }) {
  const { t, pick } = useLang();
  const title = pick(route.titleMn, route.titleEn);

  return (
    <DetailChrome
      crumbs={[
        { label: t('Нүүр'), href: '/' },
        { label: t('Улаанбаатар'), href: '/ulaanbaatar' },
        { label: title },
      ]}
    >
      <article className="d-card">
        <h1>{title}</h1>
        <span className="d-flag">{t('Явган маршрут')}</span>

        {(route.summaryMn || route.summaryEn) && (
          <p className="d-lede">{pick(route.summaryMn, route.summaryEn)}</p>
        )}

        <StopMap stops={route.stops} />
        <StopList stops={route.stops} />

        <Link className="btn btn-primary" href="/ulaanbaatar">
          {t('Бусад маршрут харах')}
        </Link>
      </article>
    </DetailChrome>
  );
}

export function RouteDetail({ route }: { route: CityRouteItem }) {
  return (
    <LangProvider
      titles={{ mn: pageTitle(route.titleMn), en: `${route.titleEn} | AYLAYOO` }}
    >
      <Body route={route} />
    </LangProvider>
  );
}
