import React, { useRef, useState } from 'react';
import { ArrowLeft, FileJson, Upload, X } from 'lucide-react';
import { Locale } from '../types';
import { mockRepository } from '../services/mockRepository';
import { PublicProfile } from '../services/repository';
import { Button } from './ui/Button';
import { Surface } from './ui/Surface';

interface ImportPageProps { locale: Locale; onReturnHome: () => void; }
const MAX_FILE_SIZE = 1024 * 1024;
const isProfile = (value: unknown): value is PublicProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<PublicProfile>;
  return typeof profile.id === 'string' && typeof profile.username === 'string' && typeof profile.displayName === 'string' && typeof profile.role === 'string' && typeof profile.bio === 'string' && typeof profile.avatarUrl === 'string' && Array.isArray(profile.pages) && Array.isArray(profile.socials) && typeof profile.theme === 'object' && profile.theme !== null;
};

export const ImportPage: React.FC<ImportPageProps> = ({ locale, onReturnHome }) => {
  const isRtl = locale === 'ar';
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const readFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setProfile(null);
    if (file.size > MAX_FILE_SIZE) {
      setError(isRtl ? 'الملف أكبر من 1 ميجابايت.' : 'The file is larger than 1 MB.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError(isRtl ? 'اختر ملف JSON.' : 'Choose a JSON file.');
      return;
    }
    try {
      const value = JSON.parse(await file.text()) as unknown;
      if (!isProfile(value)) throw new Error('invalid');
      setProfile(value);
      setFileName(file.name);
    } catch {
      setError(isRtl ? 'صيغة الملف غير صحيحة. استخدم ملف تصدير RALOA.' : 'The file format is invalid. Use a RALOA profile export.');
    }
  };

  const importProfile = async () => {
    if (!profile) return;
    setIsImporting(true);
    try {
      await mockRepository.saveProfile(profile);
      window.location.assign('/studio');
    } catch {
      setError(isRtl ? 'تعذر استيراد الملف.' : 'The profile could not be imported.');
      setIsImporting(false);
    }
  };

  return <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 px-4 py-8 text-ink sm:px-8 sm:py-14"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between gap-4"><button type="button" onClick={onReturnHome} className="flex min-h-11 items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">R</span>RALOA</button><Button variant="secondary" size="sm" onClick={() => window.location.assign('/studio')}><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{isRtl ? 'الاستوديو' : 'Studio'}</Button></header><div className="mt-12"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{isRtl ? 'نقل المحتوى' : 'Move your content'}</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">{isRtl ? 'استيراد ملفك.' : 'Import your profile.'}</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{isRtl ? 'استورد نسخة JSON من ملف RALOA محفوظ على جهازك، ثم راجعه في الاستوديو.' : 'Import a saved RALOA JSON profile, then review it in Studio before publishing.'}</p></div><Surface className="mt-8 p-5 sm:p-8"><input ref={inputRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => readFile(event.target.files?.[0])} /><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Upload className="h-6 w-6" /></span><span className="mt-4 text-sm font-extrabold">{isRtl ? 'اختر ملف JSON' : 'Choose a JSON file'}</span><span className="mt-1 text-xs text-slate-500">{isRtl ? 'الحد الأقصى 1 ميجابايت' : 'Maximum size: 1 MB'}</span></button>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}{profile && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><FileJson className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-emerald-900">{fileName}</p><p className="mt-1 text-xs text-emerald-800">{profile.displayName} · raloa.app/@{profile.username} · {profile.pages.length} {isRtl ? 'صفحة' : 'page(s)'}</p></div><button type="button" onClick={() => { setProfile(null); setFileName(''); }} className="flex h-10 w-10 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-100" aria-label={isRtl ? 'إزالة الملف' : 'Remove file'}><X className="h-4 w-4" /></button></div></div>}<div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">{isRtl ? 'الوضع التجريبي — يتم الحفظ على هذا الجهاز.' : 'Demo mode — the imported profile is saved on this device.'}</p><Button onClick={importProfile} disabled={!profile} loading={isImporting}>{isRtl ? 'استيراد إلى الاستوديو' : 'Import to Studio'}</Button></div></Surface></div></main>;
};
