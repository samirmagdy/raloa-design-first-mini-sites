import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BarChart3, ChevronDown, Eye, Link2, Users } from 'lucide-react';
import { Locale } from '../types';
import { mockRepository } from '../services/mockRepository';
import { AnalyticsSnapshot, PublicProfile } from '../services/repository';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Surface } from './ui/Surface';

interface AnalyticsPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

const AnalyticsLoading: React.FC = () => (
  <main className="min-h-screen bg-slate-50 p-4 sm:p-8" aria-busy="true" aria-label="Loading analytics">
    <div className="mx-auto max-w-[1240px] animate-pulse space-y-6"><div className="h-16 rounded-2xl bg-white" /><div className="h-32 rounded-2xl bg-white" /><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-white" />)}</div><div className="h-96 rounded-2xl bg-white" /></div>
  </main>
);

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ locale, onReturnHome }) => {
  const isRtl = locale === 'ar';
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    mockRepository.listProfiles().then((result) => {
      if (!active) return;
      setProfiles(result.data);
      setSelectedUsername(result.data[0]?.username ?? '');
    }).catch(() => active && setError(true)).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedUsername) return;
    let active = true;
    setIsLoadingAnalytics(true);
    mockRepository.getAnalytics(selectedUsername).then((result) => active && setAnalytics(result.data)).catch(() => active && setError(true)).finally(() => active && setIsLoadingAnalytics(false));
    return () => { active = false; };
  }, [selectedUsername]);

  const selectedProfile = profiles.find((profile) => profile.username === selectedUsername) ?? null;
  const clickRate = analytics && analytics.views > 0 ? `${((analytics.linkClicks / analytics.views) * 100).toFixed(1)}%` : '—';
  const maxViews = useMemo(() => Math.max(...(analytics?.timeline.map((item) => item.views) ?? [1]), 1), [analytics]);

  if (isLoading) return <AnalyticsLoading />;
  if (error && !selectedProfile) return <AnalyticsError locale={locale} onReturnHome={onReturnHome} />;

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8"><a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink"><RaloaMark size={25} theme="on-dark" /></span>RALOA</a><Button variant="secondary" size="sm" onClick={() => window.location.assign('/studio')}><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{isRtl ? 'الاستوديو' : 'Studio'}</Button></div></header>
      <div className="mx-auto max-w-[1240px] space-y-6 p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{isRtl ? 'نمو صفحتك' : 'Page growth'}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{isRtl ? 'تحليلات الأداء' : 'Analytics'}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{isRtl ? 'افهم كيف يكتشف الزوار صفحتك ويتفاعلون مع روابطك.' : 'Understand how visitors discover your page and interact with your links.'}</p></div><div className="relative w-full sm:w-64"><label htmlFor="analytics-profile" className="sr-only">{isRtl ? 'اختر الملف الشخصي' : 'Choose profile'}</label><select id="analytics-profile" value={selectedUsername} onChange={(event) => setSelectedUsername(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">{profiles.map((profile) => <option key={profile.id} value={profile.username}>@{profile.username}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" /></div></div>
        <Surface className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"><div className="flex min-w-0 items-center gap-4"><img src={selectedProfile?.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" /><div className="min-w-0"><h2 className="truncate text-lg font-extrabold">{selectedProfile?.displayName}</h2><p className="truncate text-sm text-slate-500">raloa.app/@{selectedProfile?.username}</p></div></div><div className={`inline-flex min-h-9 items-center gap-2 self-start rounded-full px-3 text-xs font-bold sm:self-auto ${selectedProfile?.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${selectedProfile?.published ? 'bg-emerald-500' : 'bg-amber-500'}`} />{selectedProfile?.published ? (isRtl ? 'منشور' : 'Published') : (isRtl ? 'مسودة' : 'Draft')}</div></Surface>
        <div className={`grid gap-4 md:grid-cols-3 ${isLoadingAnalytics ? 'opacity-60' : ''}`} aria-live="polite"><Metric icon={Eye} label={isRtl ? 'المشاهدات' : 'Views'} value={analytics ? analytics.views.toLocaleString() : '—'} detail={isRtl ? 'إجمالي الزيارات' : 'Total page visits'} color="indigo" /><Metric icon={Users} label={isRtl ? 'الزوار الفريدون' : 'Unique visitors'} value={analytics ? analytics.uniqueVisitors.toLocaleString() : '—'} detail={isRtl ? 'أشخاص مختلفون' : 'Distinct people'} color="emerald" /><Metric icon={Link2} label={isRtl ? 'نسبة النقر' : 'Click rate'} value={clickRate} detail={analytics ? `${analytics.linkClicks.toLocaleString()} ${isRtl ? 'نقرة' : 'link clicks'}` : '—'} color="purple" /></div>
        <Surface className="overflow-hidden"><div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6"><div><h2 className="text-lg font-extrabold">{isRtl ? 'نشاط آخر ٧ أيام' : 'Last 7 days'}</h2><p className="mt-1 text-xs text-slate-500">{isRtl ? 'المشاهدات اليومية لصفحتك.' : 'Daily page views from your profile.'}</p></div><span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2 w-2 rounded-full bg-indigo-500" />{isRtl ? 'مشاهدات' : 'Views'}</span></div><div className="p-5 sm:p-6"><div className="flex h-64 items-end gap-2 sm:gap-4" role="img" aria-label={isRtl ? 'مخطط المشاهدات اليومية' : 'Daily views chart'}>{(analytics?.timeline ?? []).map((item) => <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-bold text-slate-500">{item.views}</span><div className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-indigo-600 to-violet-400 transition-all" style={{ height: `${Math.max(10, (item.views / maxViews) * 190)}px` }} title={`${item.date}: ${item.views} views`} /><span className="text-[10px] text-slate-400">{item.date.slice(5)}</span></div>)}</div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[460px] border-collapse text-start text-xs"><caption className="sr-only">{isRtl ? 'تفاصيل التحليلات اليومية' : 'Daily analytics details'}</caption><thead><tr className="border-b border-slate-100 text-slate-500"><th className="px-3 py-3 font-bold">{isRtl ? 'التاريخ' : 'Date'}</th><th className="px-3 py-3 font-bold">{isRtl ? 'المشاهدات' : 'Views'}</th><th className="px-3 py-3 font-bold">{isRtl ? 'النقرات' : 'Clicks'}</th></tr></thead><tbody>{analytics?.timeline.map((item) => <tr key={item.date} className="border-b border-slate-50 text-slate-700 last:border-0"><td className="px-3 py-3 font-semibold">{item.date}</td><td className="px-3 py-3">{item.views.toLocaleString()}</td><td className="px-3 py-3">{item.clicks.toLocaleString()}</td></tr>)}</tbody></table></div></div></Surface>
        <Surface className="flex flex-col justify-between gap-4 border-indigo-100 bg-indigo-50/50 p-5 sm:flex-row sm:items-center sm:p-6"><div><h2 className="text-base font-extrabold">{isRtl ? 'هل تريد تحسين صفحتك؟' : 'Want to improve your page?'}</h2><p className="mt-1 text-sm text-slate-600">{isRtl ? 'عد إلى الاستوديو لتعديل الكتل ومشاركة صفحتك.' : 'Return to Studio to edit blocks and publish your next update.'}</p></div><Button onClick={() => window.location.assign('/studio')}><BarChart3 className="h-4 w-4" />{isRtl ? 'فتح الاستوديو' : 'Open Studio'}<ArrowUpRight className="h-4 w-4" /></Button></Surface>
      </div>
    </main>
  );
};

const Metric: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string; detail: string; color: 'indigo' | 'emerald' | 'purple' }> = ({ icon: Icon, label, value, detail, color }) => {
  const colors = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600' };
  return <Surface className="p-5"><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}><Icon className="h-5 w-5" /></span><span className="text-xs font-bold text-emerald-600">+12%</span></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Surface>;
};

const AnalyticsError: React.FC<{ locale: Locale; onReturnHome: () => void }> = ({ locale, onReturnHome }) => <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center"><Surface className="max-w-md p-8"><BarChart3 className="mx-auto h-8 w-8 text-indigo-500" /><h1 className="mt-4 text-xl font-extrabold">{locale === 'ar' ? 'تعذر تحميل التحليلات' : 'Analytics could not load'}</h1><p className="mt-2 text-sm text-slate-600">{locale === 'ar' ? 'حاول العودة إلى الموقع ثم أعد المحاولة.' : 'Return to the website and try again.'}</p><Button className="mt-5" onClick={onReturnHome}>{locale === 'ar' ? 'العودة للموقع' : 'Back to website'}</Button></Surface></main>;
