import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Locale } from '../types';
import { publicProfileFixtures } from '../data/fixtures';
import { mockRepository } from '../services/mockRepository';
import { PublicProfile } from '../services/repository';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';

interface OnboardingPageProps { locale: Locale; onReturnHome: () => void; }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ locale, onReturnHome }) => {
  const isRtl = locale === 'ar';
  const [templateId, setTemplateId] = useState(publicProfileFixtures[0]?.id ?? '');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const template = useMemo(() => publicProfileFixtures.find((profile) => profile.id === templateId) ?? publicProfileFixtures[0], [templateId]);

  const createProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    const existing = profiles ?? (await mockRepository.listProfiles()).data;
    setProfiles(existing);
    if (!slugPattern.test(normalizedUsername)) {
      setError(isRtl ? 'استخدم حروفاً صغيرة وأرقاماً وشرطات فقط.' : 'Use lowercase letters, numbers, and hyphens only.');
      return;
    }
    if (existing.some((profile) => profile.username === normalizedUsername)) {
      setError(isRtl ? 'اسم المستخدم مستخدم بالفعل.' : 'That username is already in use.');
      return;
    }
    if (!template) return;
    setIsCreating(true);
    setError('');
    try {
      const profile = clone(template);
      profile.id = `profile-${normalizedUsername}`;
      profile.username = normalizedUsername;
      profile.displayName = displayName.trim() || template.displayName;
      profile.published = false;
      profile.pages = profile.pages.map((page) => ({ ...page, id: `${normalizedUsername}-${page.id}`, published: false }));
      await mockRepository.saveProfile(profile);
      window.location.assign('/studio');
    } catch {
      setError(isRtl ? 'تعذر إنشاء الملف الشخصي.' : 'The profile could not be created.');
      setIsCreating(false);
    }
  };

  return <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 px-4 py-8 text-ink sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between gap-4"><button type="button" onClick={onReturnHome} className="flex min-h-11 items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">R</span>RALOA</button><span className="text-xs font-bold text-slate-500">{isRtl ? 'الخطوة 1 من 1' : 'Step 1 of 1'}</span></header><div className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{isRtl ? 'ابدأ صفحتك' : 'Start your page'}</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{isRtl ? 'أنشئ مساحتك العامة.' : 'Create your public space.'}</h1><p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">{isRtl ? 'اختر نقطة بداية، أضف اسمك، ثم أكمل التخصيص من الاستوديو.' : 'Choose a starting point, add your name, then continue customizing in Studio.'}</p><div className="mt-8 space-y-3 text-sm font-bold text-slate-700"><p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{isRtl ? 'صفحة خاصة حتى تنشرها' : 'Private until you publish'}</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{isRtl ? 'يمكنك تعديل كل كتلة' : 'Every block stays editable'}</p></div></div><Surface className="p-5 sm:p-7"><form onSubmit={createProfile} className="space-y-5"><div><label htmlFor="onboarding-template" className="mb-2 block text-sm font-bold text-slate-800">{isRtl ? 'اختر نقطة البداية' : 'Choose a starting point'}</label><div className="relative"><select id="onboarding-template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pe-9 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">{publicProfileFixtures.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} — {profile.role}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-4 h-4 w-4 text-slate-500" aria-hidden="true" /></div></div><Input label={isRtl ? 'اسم المستخدم' : 'Username'} value={username} onChange={(event) => { setUsername(event.target.value); setError(''); }} placeholder="your-name" required aria-describedby="username-help" /><p id="username-help" className="-mt-3 text-xs text-slate-500">{isRtl ? 'سيصبح جزءاً من raloa.app/@اسمك' : 'This becomes raloa.app/@your-name'}</p><Input label={isRtl ? 'اسم العرض' : 'Display name'} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={template?.displayName} /><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{isRtl ? 'المعاينة' : 'Preview'}</p><div className="mt-3 flex items-center gap-3"><img src={template?.avatarUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /><div><p className="text-sm font-extrabold">{displayName.trim() || template?.displayName}</p><p className="text-xs text-slate-500">raloa.app/@{username.trim().toLowerCase() || 'your-name'}</p></div></div></div>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}<Button type="submit" className="w-full" loading={isCreating}>{isRtl ? 'إنشاء صفحتي' : 'Create my page'}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Button></form></Surface></div></div></main>;
};
