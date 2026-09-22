import React, { useEffect, useState } from 'react';
import { ChevronDown, FileText, LayoutDashboard, LogOut, Menu, MonitorPlay, Settings, X } from 'lucide-react';
import { Locale } from '../../types';
import { mockRepository } from '../../services/mockRepository';
import { ProfilePage, PublicProfile } from '../../services/repository';
import { RaloaMark } from '../brand/RaloaLogo';
import { BlockEditorWorkspace } from './BlockEditorWorkspace';
import { StudioPreviewWorkspace } from './StudioPreviewWorkspace';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { Toast } from '../ui/Toast';

interface StudioShellProps {
  locale: Locale;
  onReturnHome: () => void;
}

type StudioSection = 'overview' | 'editor' | 'preview' | 'settings';

const StudioLoading: React.FC = () => (
  <main className="min-h-screen bg-slate-50 p-4 sm:p-6" aria-busy="true" aria-label="Loading Studio">
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5">
      <div className="h-16 rounded-2xl bg-white" />
      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <div className="h-[620px] rounded-2xl bg-white" />
        <div className="h-[620px] rounded-2xl bg-white" />
      </div>
    </div>
  </main>
);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const StudioShell: React.FC<StudioShellProps> = ({ locale, onReturnHome }) => {
  const isRtl = locale === 'ar';
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<PublicProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [section, setSection] = useState<StudioSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [toast, setToast] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    let active = true;
    mockRepository.listProfiles().then((result) => {
      if (!active) return;
      setProfiles(result.data);
      setSavedProfiles(clone(result.data));
      setSelectedProfileId(result.data[0]?.id ?? '');
      setSelectedPageId(result.data[0]?.pages[0]?.id ?? '');
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedPage = selectedProfile?.pages.find((page) => page.id === selectedPageId) ?? selectedProfile?.pages[0] ?? null;

  const navItems = [
    { id: 'overview' as const, label: isRtl ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'editor' as const, label: isRtl ? 'محرر الصفحة' : 'Page editor', icon: FileText },
    { id: 'preview' as const, label: isRtl ? 'معاينة ونشر' : 'Preview & publish', icon: MonitorPlay },
    { id: 'settings' as const, label: isRtl ? 'الإعدادات' : 'Settings', icon: Settings }
  ];

  const selectProfile = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    setSelectedProfileId(id);
    setSelectedPageId(profile?.pages[0]?.id ?? '');
    setHasUnsavedChanges(false);
  };

  const saveChanges = async () => {
    if (!selectedProfile) return;
    const result = await mockRepository.saveProfile(selectedProfile);
    setSavedProfiles((current) => current.map((profile) => profile.id === result.data.id ? clone(result.data) : profile));
    setHasUnsavedChanges(false);
    setToast({ title: isRtl ? 'تم حفظ التغييرات' : 'Changes saved', message: isRtl ? 'تم الحفظ على هذا الجهاز.' : 'Saved locally on this device.' });
  };

  const resetChanges = () => {
    setProfiles(clone(savedProfiles));
    setHasUnsavedChanges(false);
    setConfirmDiscard(false);
    setToast({ title: isRtl ? 'تم تجاهل التغييرات' : 'Changes discarded', message: isRtl ? 'تمت استعادة آخر نسخة محفوظة.' : 'The last saved version is active.' });
  };

  const publishProfile = async () => {
    if (!selectedProfile) return;
    const publishedProfile: PublicProfile = {
      ...selectedProfile,
      published: true,
      pages: selectedProfile.pages.map((page) => page.id === selectedPage?.id ? { ...page, published: true } : page)
    };
    setProfiles((current) => current.map((profile) => profile.id === publishedProfile.id ? publishedProfile : profile));
    const result = await mockRepository.saveProfile(publishedProfile);
    setSavedProfiles((current) => current.map((profile) => profile.id === result.data.id ? clone(result.data) : profile));
    setHasUnsavedChanges(false);
    setToast({ title: isRtl ? 'تم نشر الصفحة' : 'Page published', message: isRtl ? 'صفحتك متاحة الآن للزوار.' : 'Your public page is now available to visitors.' });
  };

  const updateSelectedPage = (nextPage: ProfilePage) => {
    setProfiles((current) => current.map((profile) => profile.id === selectedProfileId
      ? { ...profile, pages: profile.pages.map((page) => page.id === nextPage.id ? nextPage : page) }
      : profile));
  };

  if (isLoading) return <StudioLoading />;
  if (error) return <StudioError onReturnHome={onReturnHome} locale={locale} />;
  if (!selectedProfile) return <StudioEmpty onReturnHome={onReturnHome} locale={locale} />;

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {mobileNavOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" aria-label={isRtl ? 'إغلاق القائمة' : 'Close navigation'} onClick={() => setMobileNavOpen(false)} />}

        <aside className={`fixed inset-y-0 start-0 z-40 flex w-[280px] flex-col border-e border-slate-200 bg-white p-5 shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none rtl:start-auto rtl:end-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-sm font-extrabold" onClick={(event) => { event.preventDefault(); onReturnHome(); }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink"><RaloaMark size={25} theme="on-dark" /></span>
              <span>RALOA Studio</span>
            </a>
            <button type="button" onClick={() => setMobileNavOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 lg:hidden" aria-label={isRtl ? 'إغلاق القائمة' : 'Close navigation'}><X className="h-4 w-4" /></button>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label htmlFor="studio-profile" className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{isRtl ? 'الملف الشخصي' : 'Profile'}</label>
            <div className="relative">
              <select id="studio-profile" value={selectedProfile.id} onChange={(event) => selectProfile(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>@{profile.username}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
          </div>

          <nav className="mt-8 space-y-1" aria-label={isRtl ? 'تنقل الاستوديو' : 'Studio navigation'}>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => { setSection(id); setMobileNavOpen(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${section === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-100 pt-4">
            <button type="button" onClick={onReturnHome} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-4 w-4" aria-hidden="true" />{isRtl ? 'العودة للموقع' : 'Back to website'}</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileNavOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden" aria-label={isRtl ? 'فتح القائمة' : 'Open navigation'}><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold sm:text-lg">{navItems.find((item) => item.id === section)?.label}</h1>
                <p className="truncate text-xs text-slate-500">raloa.app/@{selectedProfile.username}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasUnsavedChanges && <span className="hidden items-center gap-1.5 text-xs font-bold text-amber-700 sm:flex"><span className="h-2 w-2 rounded-full bg-amber-500" />{isRtl ? 'تغييرات غير محفوظة' : 'Unsaved changes'}</span>}
              <Button size="sm" variant={hasUnsavedChanges ? 'primary' : 'secondary'} onClick={hasUnsavedChanges ? saveChanges : () => setHasUnsavedChanges(true)}>{hasUnsavedChanges ? (isRtl ? 'حفظ' : 'Save changes') : (isRtl ? 'تعديل' : 'Make an edit')}</Button>
            </div>
          </header>

          <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{isRtl ? 'مساحة العمل' : 'Workspace'}</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{selectedProfile.displayName}</h2><p className="mt-1 text-sm text-slate-600">{isRtl ? selectedProfile.roleAr : selectedProfile.role}</p></div>
              <div className="relative w-full sm:w-64"><label htmlFor="studio-page" className="sr-only">{isRtl ? 'اختر الصفحة' : 'Select page'}</label><select id="studio-page" value={selectedPage?.id ?? ''} onChange={(event) => { setSelectedPageId(event.target.value); setHasUnsavedChanges(true); }} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">{selectedProfile.pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" /></div>
            </div>

            {section === 'overview' && <Overview profile={selectedProfile} page={selectedPage} locale={locale} onEdit={() => { setSection('editor'); setHasUnsavedChanges(true); }} />}
            {section === 'editor' && <BlockEditorWorkspace page={selectedPage} locale={locale} onPageChange={updateSelectedPage} onDirty={() => setHasUnsavedChanges(true)} />}
            {section === 'preview' && <StudioPreviewWorkspace profile={selectedProfile} page={selectedPage} locale={locale} onPublish={publishProfile} />}
            {section === 'settings' && <SettingsWorkspace profile={selectedProfile} locale={locale} onDirty={() => setHasUnsavedChanges(true)} />}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <span className="text-xs text-slate-500">{isRtl ? 'المعاينة المحلية — لا يوجد نشر متصل بعد.' : 'Local preview — publishing is not connected yet.'}</span>
              {hasUnsavedChanges && <button type="button" onClick={() => setConfirmDiscard(true)} className="min-h-11 rounded-full px-3 text-xs font-bold text-slate-600 hover:bg-slate-100">{isRtl ? 'تجاهل التغييرات' : 'Discard changes'}</button>}
            </div>
          </div>
        </section>
      </div>

      {toast && <div className="fixed bottom-5 start-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"><Toast title={toast.title} message={toast.message} tone="success" onDismiss={() => setToast(null)} /></div>}
      {confirmDiscard && <ConfirmDialog locale={locale} onCancel={() => setConfirmDiscard(false)} onConfirm={resetChanges} />}
    </main>
  );
};

const Overview: React.FC<{ profile: PublicProfile; page: ProfilePage | null; locale: Locale; onEdit: () => void }> = ({ profile, page, locale, onEdit }) => (
  <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
    <Surface className="p-5 sm:p-6"><div className="flex items-center gap-4"><img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" /><div><h3 className="text-lg font-extrabold">{profile.displayName}</h3><p className="text-sm text-slate-500">raloa.app/@{profile.username}</p></div></div><p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600">{locale === 'ar' ? profile.bioAr : profile.bio}</p><Button className="mt-5" onClick={onEdit}>{locale === 'ar' ? 'فتح المحرر' : 'Open page editor'}</Button></Surface>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"><Metric label={locale === 'ar' ? 'الصفحة الحالية' : 'Current page'} value={page?.title ?? '—'} /><Metric label={locale === 'ar' ? 'الروابط المنشورة' : 'Published blocks'} value={String(page?.blocks.filter((block) => block.visible).length ?? 0)} /></div>
  </div>
);

const SettingsWorkspace: React.FC<{ profile: PublicProfile; locale: Locale; onDirty: () => void }> = ({ profile, locale, onDirty }) => (
  <Surface className="max-w-3xl p-5 sm:p-8"><h3 className="text-lg font-extrabold">{locale === 'ar' ? 'إعدادات الملف الشخصي' : 'Profile settings'}</h3><p className="mt-1 text-sm text-slate-600">{locale === 'ar' ? 'تتصل نماذج الإعدادات بخدمة الملف الشخصي في مرحلة لاحقة.' : 'Profile settings will connect to the profile service in a later phase.'}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><ReadOnlySetting label={locale === 'ar' ? 'اسم المستخدم' : 'Username'} value={`@${profile.username}`} /><ReadOnlySetting label={locale === 'ar' ? 'حالة النشر' : 'Publication status'} value={profile.published ? (locale === 'ar' ? 'منشور' : 'Published') : (locale === 'ar' ? 'مسودة' : 'Draft')} /></div><button type="button" onClick={onDirty} className="mt-6 min-h-11 rounded-full border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">{locale === 'ar' ? 'تعديل إعدادات الملف' : 'Edit profile settings'}</button></Surface>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <Surface className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 truncate text-xl font-extrabold text-ink">{value}</p></Surface>;
const ReadOnlySetting: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p></div>;

const ConfirmDialog: React.FC<{ locale: Locale; onCancel: () => void; onConfirm: () => void }> = ({ locale, onCancel, onConfirm }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"><h2 className="text-lg font-extrabold">{locale === 'ar' ? 'تجاهل التغييرات؟' : 'Discard changes?'}</h2><p className="mt-2 text-sm text-slate-600">{locale === 'ar' ? 'ستفقد التعديلات المحلية غير المحفوظة.' : 'Your unsaved local changes will be removed.'}</p><div className="mt-6 flex gap-2"><Button variant="secondary" className="flex-1" onClick={onCancel}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button><Button variant="danger" className="flex-1" onClick={onConfirm}>{locale === 'ar' ? 'تجاهل' : 'Discard'}</Button></div></div></div>;
const StudioError: React.FC<{ locale: Locale; onReturnHome: () => void }> = ({ locale, onReturnHome }) => <StudioMessage title={locale === 'ar' ? 'تعذر تحميل الاستوديو' : 'Studio could not load'} body={locale === 'ar' ? 'حاول إعادة تحميل الصفحة.' : 'Try reloading the workspace.'} action={onReturnHome} actionLabel={locale === 'ar' ? 'العودة للموقع' : 'Back to website'} />;
const StudioEmpty: React.FC<{ locale: Locale; onReturnHome: () => void }> = ({ locale, onReturnHome }) => <StudioMessage title={locale === 'ar' ? 'لا توجد ملفات شخصية' : 'No profiles yet'} body={locale === 'ar' ? 'أنشئ ملفاً شخصياً لبدء استخدام الاستوديو.' : 'Create a profile to start using Studio.'} action={onReturnHome} actionLabel={locale === 'ar' ? 'العودة للموقع' : 'Back to website'} />;
const StudioMessage: React.FC<{ title: string; body: string; action: () => void; actionLabel: string }> = ({ title, body, action, actionLabel }) => <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center"><Surface className="max-w-md p-8"><h1 className="text-xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-slate-600">{body}</p><Button className="mt-5" onClick={action}>{actionLabel}</Button></Surface></main>;
