import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BarChart3, Eye, Link2, Mail, MousePointerClick, Users } from 'lucide-react';
import type { Locale } from '../types';
import { AppLink } from '../app/navigation';
import { useRepository } from '../services/RepositoryContext';
import { useAsyncResource } from '../services/useAsyncResource';
import type { AnalyticsRange, AnalyticsSnapshot } from '../services';
import { chartPalette } from '../design/tokens';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';
import { Tabs } from '../components/ui/Tabs';
import { LoadingState, ErrorState, EmptyState } from './ui/States';
import { ui, text, tx } from '../i18n/ui';

interface AnalyticsPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

const RANGES: AnalyticsRange[] = ['7d', '30d', '90d'];

const rangeLabel = (range: AnalyticsRange, locale: Locale): string =>
  range === '7d' ? tx(ui.analytics.range7, locale) : range === '30d' ? tx(ui.analytics.range30, locale) : tx(ui.analytics.range90, locale);

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ locale, onReturnHome }) => {
  const repository = useRepository();
  const isRtl = locale === 'ar';
  const [profileId, setProfileId] = useState('');
  const [range, setRange] = useState<AnalyticsRange>('7d');

  const profiles = useAsyncResource(() => repository.profiles.list(), []);
  const selectedId = profileId || profiles.data?.[0]?.id || '';

  const snapshot = useAsyncResource<AnalyticsSnapshot | null>(
    async () => {
      if (!selectedId) return { ok: true as const, data: null };
      return repository.analytics.snapshot({ profileId: selectedId, range });
    },
    [selectedId, range],
    { enabled: Boolean(selectedId) }
  );

  const selected = useMemo(
    () => (profiles.data ?? []).find((item) => item.id === selectedId) ?? null,
    [profiles.data, selectedId]
  );

  const data = snapshot.data;
  const maxViews = Math.max(...(data?.timeline.map((point) => point.views) ?? [1]), 1);
  const maxClicks = Math.max(...(data?.topLinks.map((link) => link.clicks) ?? [1]), 1);

  if (profiles.isLoading || (!profiles.error && !selected)) {
    return <AnalyticsFrame locale={locale}><LoadingState label={tx(ui.common.loading, locale)} variant="chart" /></AnalyticsFrame>;
  }

  if (profiles.error) {
    return (
      <AnalyticsFrame locale={locale}>
        <ErrorState
          title={tx(ui.analytics.heading, locale)}
          body={text(profiles.error.message, locale)}
          onRetry={profiles.retry}
          retryLabel={tx(ui.common.retry, locale)}
        />
      </AnalyticsFrame>
    );
  }

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-surface-alt text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
          <a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex items-center gap-2 text-sm font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink">
              <RaloaMark size={25} theme="on-dark" />
            </span>
            RALOA
          </a>
          <AppLink to="/studio/preview">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {tx(ui.studio.title, locale)}
            </Button>
          </AppLink>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] space-y-6 p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{tx(ui.analytics.heading, locale)}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{selected?.displayName}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{tx(ui.analytics.help, locale)}</p>
            <p className="mt-3 inline-flex rounded-pill bg-slate-100 px-3 py-1 text-2xs font-bold text-slate-500">{tx(ui.analytics.demoBadge, locale)}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <Select
              label={tx(ui.common.profile, locale)}
              value={selectedId}
              onChange={(event) => setProfileId(event.target.value)}
              options={(profiles.data ?? []).map((item) => ({ value: item.id, label: `@${item.username}` }))}
              className="sm:w-56"
            />
            <Tabs
              ariaLabel={tx(ui.analytics.heading, locale)}
              value={range}
              onChange={(id) => setRange(id as AnalyticsRange)}
              items={RANGES.map((item) => ({ id: item, label: rangeLabel(item, locale) }))}
            />
          </div>
        </div>

        {snapshot.isLoading ? (
          <LoadingState label={tx(ui.common.loading, locale)} variant="chart" />
        ) : snapshot.error ? (
          <ErrorState title={tx(ui.analytics.heading, locale)} body={text(snapshot.error.message, locale)} onRetry={snapshot.retry} retryLabel={tx(ui.common.retry, locale)} />
        ) : !data || data.views === 0 ? (
          <EmptyState icon={BarChart3} title={tx(ui.analytics.noData, locale)} body={tx(ui.analytics.noDataBody, locale)} note={tx(ui.analytics.demoBadge, locale)} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric icon={Eye} label={tx(ui.analytics.views, locale)} value={data.views} detail={rangeLabel(range, locale)} tone="indigo" />
              <Metric icon={Users} label={tx(ui.analytics.uniqueVisitors, locale)} value={data.uniqueVisitors} detail={isRtl ? 'زوار مختلفون' : 'Distinct visitors'} tone="emerald" />
              <Metric icon={Link2} label={tx(ui.analytics.linkClicks, locale)} value={data.linkClicks} detail={isRtl ? 'ضغطات على الكتل' : 'Block clicks'} tone="purple" />
              <Metric
                icon={MousePointerClick}
                label={tx(ui.analytics.clickRate, locale)}
                value={`${(data.clickThroughRate * 100).toFixed(1)}%`}
                detail={`${tx(ui.analytics.formSubmissions, locale)}: ${data.formSubmissions}`}
                tone="amber"
              />
            </div>

            <Surface className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-extrabold">{tx(ui.analytics.trend, locale)}</h2>
                  <p className="mt-1 text-xs text-slate-500">{rangeLabel(range, locale)}</p>
                </div>
                <span className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartPalette[0] }} aria-hidden="true" />
                    {tx(ui.analytics.views, locale)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartPalette[1] }} aria-hidden="true" />
                    {tx(ui.analytics.linkClicks, locale)}
                  </span>
                </span>
              </div>

              <div className="p-5">
                <div className="flex h-56 items-end gap-1 overflow-x-auto" role="img" aria-label={`${tx(ui.analytics.trend, locale)} — ${rangeLabel(range, locale)}`}>
                  {data.timeline.map((point) => (
                    <div key={point.date} className="flex min-w-[14px] flex-1 flex-col items-center justify-end gap-1">
                      <div className="flex h-full w-full items-end justify-center gap-[2px]">
                        <span
                          className="w-1/2 rounded-t-sm transition-[height]"
                          style={{ height: `${Math.max(2, (point.views / maxViews) * 100)}%`, backgroundColor: chartPalette[0] }}
                          title={`${point.date}: ${point.views} ${tx(ui.analytics.views, locale)}`}
                        />
                        <span
                          className="w-1/3 rounded-t-sm transition-[height]"
                          style={{ height: `${Math.max(2, (point.clicks / maxViews) * 100)}%`, backgroundColor: chartPalette[1] }}
                          title={`${point.date}: ${point.clicks} ${tx(ui.analytics.linkClicks, locale)}`}
                        />
                      </div>
                      <span className="text-2xs text-slate-400">{point.date.slice(range === '7d' ? 5 : 5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>

            <div className="grid gap-5 lg:grid-cols-2">
              <Surface className="p-5">
                <h2 className="text-base font-extrabold">{tx(ui.analytics.topLinks, locale)}</h2>
                <ol className="mt-4 space-y-3">
                  {data.topLinks.map((link, index) => (
                    <li key={link.blockId}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-5 w-5 shrink-0 rounded-md bg-slate-100 text-center text-2xs font-extrabold leading-5 text-slate-600 tabular-nums">
                            {index + 1}
                          </span>
                          <span className="min-w-0 truncate font-bold text-slate-800">{text(link.title, locale, isRtl ? 'كتلة محذوفة' : 'Removed block')}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-slate-500 tabular-nums">
                          {link.clicks} · {(link.clickThroughRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-slate-100">
                        <div className="h-full rounded-pill" style={{ width: `${Math.max(4, (link.clicks / maxClicks) * 100)}%`, backgroundColor: chartPalette[0] }} />
                      </div>
                    </li>
                  ))}
                  {!data.topLinks.length && <li className="text-xs text-slate-500">{tx(ui.analytics.noData, locale)}</li>}
                </ol>
              </Surface>

              <div className="space-y-5">
                <Surface className="p-5">
                  <h2 className="text-base font-extrabold">{tx(ui.analytics.referrers, locale)}</h2>
                  <ul className="mt-4 space-y-2 text-sm">
                    {data.referrers.map((referrer) => (
                      <li key={referrer.host} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-slate-700">
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate" dir="ltr">{referrer.host || tx(ui.analytics.direct, locale)}</span>
                        </span>
                        <span className="shrink-0 font-bold text-slate-500 tabular-nums">{referrer.views}</span>
                      </li>
                    ))}
                    {!data.referrers.length && <li className="text-xs text-slate-500">{tx(ui.analytics.noData, locale)}</li>}
                  </ul>
                </Surface>

                <Surface className="p-5">
                  <h2 className="text-base font-extrabold">{tx(ui.analytics.campaigns, locale)}</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[320px] border-collapse text-start text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500">
                          <th className="py-2 pe-3 font-bold">source / campaign</th>
                          <th className="py-2 pe-3 font-bold">{tx(ui.analytics.views, locale)}</th>
                          <th className="py-2 font-bold">{tx(ui.analytics.linkClicks, locale)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.campaigns.map((campaign) => (
                          <tr key={`${campaign.utmSource}-${campaign.utmCampaign}`} className="border-b border-slate-50 last:border-0 text-slate-700">
                            <td className="py-2 pe-3 font-semibold" dir="ltr">
                              {campaign.utmSource} / {campaign.utmCampaign}
                            </td>
                            <td className="py-2 pe-3 tabular-nums">{campaign.views}</td>
                            <td className="py-2 tabular-nums">{campaign.clicks}</td>
                          </tr>
                        ))}
                        {!data.campaigns.length && (
                          <tr>
                            <td colSpan={3} className="py-3 text-xs text-slate-500">{tx(ui.analytics.noData, locale)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Surface>
              </div>
            </div>

            <Surface className="flex flex-col justify-between gap-4 border-indigo-100 bg-indigo-50/50 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-extrabold">{isRtl ? 'هل تريد تحسين صفحتك؟' : 'Want to improve your page?'}</h2>
                <p className="mt-1 text-sm text-slate-600">{isRtl ? 'عد إلى الاستوديو لتعديل الكتل.' : 'Return to Studio to reorder blocks and publish an update.'}</p>
              </div>
              <AppLink to="/studio/editor">
                <Button>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {tx(ui.studio.editor, locale)}
                </Button>
              </AppLink>
            </Surface>
          </>
        )}
      </div>
    </main>
  );
};

const AnalyticsFrame: React.FC<{ locale: Locale; children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-screen bg-surface-alt p-4 sm:p-8">
    <div className="mx-auto max-w-[1240px]">{children}</div>
  </main>
);

const Metric: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  detail: string;
  tone: 'indigo' | 'emerald' | 'purple' | 'amber';
}> = ({ icon: Icon, label, value, detail, tone }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <Surface className="p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-control ${colors[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </Surface>
  );
};
