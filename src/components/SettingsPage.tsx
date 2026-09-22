import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ExternalLink, RotateCcw, Save, Settings2 } from 'lucide-react';
import { Locale } from '../types';
import { mockRepository } from '../services/mockRepository';
import { ProfilePage, PublicProfile } from '../services/repository';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { Toast } from './ui/Toast';

interface SettingsPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const SettingsPage: React.FC<SettingsPageProps> = ({ locale, onReturnHome }) => {
  const isRtl = locale === 'ar';
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [draft, setDraft] = useState<PublicProfile | null>(null);
  const [saved, setSaved] = useState<PublicProfile | null>(null);
  const [pageId, setPageId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let active = true;
    mockRepository.listProfiles().then((result) => {
      if (!active) return;
      const first = result.data[0] ? clone(result.data[0]) : null;
      setProfiles(result.data);
      setDraft(first);
      setSaved(first);
      setPageId(first?.pages[0]?.id ?? '');
    }).catch(() => active && setError(true)).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  const selectedPage = useMemo(() => draft?.pages.find((page) => page.id === pageId) ?? draft?.pages[0] ?? null, [draft, pageId]);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(saved);

  const selectProfile = (username: string) => {
    const next = profiles.find((profile) => profile.username === username);
    if (!next) return;
    const nextDraft = clone(next);
    setDraft(nextDraft);
    setSaved(nextDraft);
    setPageId(nextDraft.pages[0]?.id ?? '');
  };

  const updateDraft = (patch: Partial<PublicProfile>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updatePage = (patch: Partial<ProfilePage>) => setDraft((current) => current ? { ...current, pages: current.pages.map((page) => page.id === selectedPage?.id ? { ...page, ...patch } : page) } : current);

  const saveChanges = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const result = await mockRepository.saveProfile(draft);
      const next = clone(result.data);
      setDraft(next);
      setSaved(next);
      setProfiles((current) => current.map((profile) => profile.id === next.id ? next : profile));
      setToast({ title: isRtl ? 'تم حفظ الإعدادات' : 'Settings saved', message: isRtl ? 'تم حفظ التغييرات على هذا الجهاز.' : 'Your changes were saved on this device.', tone: 'success' });
    } catch {
      setToast({ title: isRtl ? 'تعذر الحفظ' : 'Could not save settings', message: isRtl ? 'حاول مرة أخرى.' : 'Please try again.', tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    if (!saved) return;
    const next = clone(saved);
    setDraft(next);
    setPageId(next.pages[0]?.id ?? '');
  };

  if (isLoading) return <SettingsLoading />;
  if (error || !draft) return <SettingsError locale={locale} onReturnHome={onReturnHome} />;

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8"><a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink"><RaloaMark size={25} theme="on-dark" /></span>RALOA</a><div className="flex items-center gap-2"><Button variant="secondary" size="sm" onClick={() => window.location.assign('/analytics')}>{isRtl ? 'التحليلات' : 'Analytics'}</Button><Button variant="secondary" size="sm" onClick={() => window.location.assign('/studio')}><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{isRtl ? 'الاستوديو' : 'Studio'}</Button></div></div></header>
      <div className="mx-auto max-w-[1240px] space-y-6 p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{isRtl ? 'التحكم في صفحتك' : 'Control your page'}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{isRtl ? 'الإعدادات' : 'Settings'}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{isRtl ? 'حدّث معلوماتك وحالة نشر صفحاتك العامة.' : 'Update your identity and publication settings for your public pages.'}</p></div><div className="relative w-full sm:w-64"><label htmlFor="settings-profile" className="sr-only">{isRtl ? 'اختر الملف الشخصي' : 'Choose profile'}</label><select id="settings-profile" value={draft.username} onChange={(event) => selectProfile(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">{profiles.map((profile) => <option key={profile.id} value={profile.username}>@{profile.username}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" /></div></div>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Surface className="p-5 sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Settings2 className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold">{isRtl ? 'معلومات الملف' : 'Profile information'}</h2><p className="mt-0.5 text-xs text-slate-500">{isRtl ? 'تظهر هذه المعلومات في صفحتك العامة.' : 'This information appears on your public page.'}</p></div></div><div className="mt-5 space-y-4"><Input label={isRtl ? 'اسم العرض' : 'Display name'} value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} /><Input label={isRtl ? 'المسمى الوظيفي' : 'Role'} value={draft.role} onChange={(event) => updateDraft({ role: event.target.value })} /><Input label={isRtl ? 'رابط الصورة' : 'Avatar URL'} value={draft.avatarUrl} onChange={(event) => updateDraft({ avatarUrl: event.target.value })} placeholder="https://" /><label className="block text-start"><span className="mb-2 block text-sm font-bold text-slate-800">{isRtl ? 'النبذة' : 'Bio'}</span><textarea value={draft.bio} onChange={(event) => updateDraft({ bio: event.target.value })} rows={4} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" /></label></div></Surface>
          <div className="space-y-5"><Surface className="p-5 sm:p-6"><h2 className="text-base font-extrabold">{isRtl ? 'النشر' : 'Publication'}</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{draft.published ? (isRtl ? 'صفحتك متاحة للزوار حالياً.' : 'Your profile is currently available to visitors.') : (isRtl ? 'صفحتك خاصة ولن تظهر للزوار.' : 'Your profile is private and hidden from visitors.')}</p><button type="button" aria-pressed={draft.published} onClick={() => updateDraft({ published: !draft.published })} className={`mt-5 flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-sm font-bold transition ${draft.published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><span>{draft.published ? (isRtl ? 'منشور' : 'Published') : (isRtl ? 'مسودة' : 'Draft')}</span><span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${draft.published ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-300'}`}><span className="h-4 w-4 rounded-full bg-white shadow-sm" /></span></button></Surface><Surface className="p-5 sm:p-6"><h2 className="text-base font-extrabold">{isRtl ? 'إعدادات الصفحة' : 'Page settings'}</h2><div className="mt-4 space-y-4"><div className="relative"><label htmlFor="settings-page" className="mb-2 block text-sm font-bold text-slate-800">{isRtl ? 'الصفحة' : 'Page'}</label><select id="settings-page" value={selectedPage?.id ?? ''} onChange={(event) => setPageId(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">{draft.pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-10 h-4 w-4 text-slate-500" aria-hidden="true" /></div><Input label={isRtl ? 'عنوان الصفحة' : 'Page title'} value={selectedPage?.title ?? ''} onChange={(event) => updatePage({ title: event.target.value })} /><label className="block text-start"><span className="mb-2 block text-sm font-bold text-slate-800">{isRtl ? 'وصف الصفحة' : 'Page description'}</span><textarea value={selectedPage?.description ?? ''} onChange={(event) => updatePage({ description: event.target.value })} rows={3} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" /></label><label className="flex min-h-11 items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={selectedPage?.published ?? false} onChange={(event) => updatePage({ published: event.target.checked })} className="h-4 w-4 accent-indigo-600" />{isRtl ? 'هذه الصفحة منشورة' : 'This page is published'}</label></div></Surface></div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">{isRtl ? 'الوضع التجريبي — يتم الحفظ على هذا الجهاز.' : 'Demo mode — changes are saved on this device.'}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={resetChanges} disabled={!hasChanges}><RotateCcw className="h-4 w-4" />{isRtl ? 'إلغاء التغييرات' : 'Reset changes'}</Button><Button onClick={saveChanges} loading={isSaving} disabled={!hasChanges}><Save className="h-4 w-4" />{isRtl ? 'حفظ الإعدادات' : 'Save settings'}</Button><Button variant="secondary" onClick={() => window.open(`/p/${draft.username}`, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" />{isRtl ? 'فتح الصفحة' : 'Open page'}</Button></div></div>
      </div>
      {toast && <div className="fixed bottom-5 start-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"><Toast title={toast.title} message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /></div>}
    </main>
  );
};

const SettingsLoading: React.FC = () => <main className="min-h-screen bg-slate-50 p-4 sm:p-8" aria-busy="true" aria-label="Loading settings"><div className="mx-auto max-w-[1240px] animate-pulse space-y-6"><div className="h-16 rounded-2xl bg-white" /><div className="h-28 rounded-2xl bg-white" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-[540px] rounded-2xl bg-white" /><div className="h-[540px] rounded-2xl bg-white" /></div></div></main>;
const SettingsError: React.FC<{ locale: Locale; onReturnHome: () => void }> = ({ locale, onReturnHome }) => <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center"><Surface className="max-w-md p-8"><Settings2 className="mx-auto h-8 w-8 text-indigo-500" /><h1 className="mt-4 text-xl font-extrabold">{locale === 'ar' ? 'تعذر تحميل الإعدادات' : 'Settings could not load'}</h1><p className="mt-2 text-sm text-slate-600">{locale === 'ar' ? 'حاول العودة إلى الموقع ثم أعد المحاولة.' : 'Return to the website and try again.'}</p><Button className="mt-5" onClick={onReturnHome}>{locale === 'ar' ? 'العودة للموقع' : 'Back to website'}</Button></Surface></main>;
