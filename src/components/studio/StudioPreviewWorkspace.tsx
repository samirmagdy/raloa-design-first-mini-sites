import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Globe2, Share2 } from 'lucide-react';
import { Locale } from '../../types';
import { ProfilePage, PublicProfile } from '../../services/repository';
import { ProfileBlockView } from '../profile/BlockRenderer';
import { copyTextToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';

interface StudioPreviewWorkspaceProps {
  profile: PublicProfile;
  page: ProfilePage | null;
  locale: Locale;
  onPublish: () => Promise<void>;
}

export const StudioPreviewWorkspace: React.FC<StudioPreviewWorkspaceProps> = ({ profile, page, locale, onPublish }) => {
  const isRtl = locale === 'ar';
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const publicUrl = `${window.location.origin}/p/${profile.username}`;
  const accent = profile.theme.accent;

  const copyUrl = async () => {
    const didCopy = await copyTextToClipboard(publicUrl);
    if (didCopy) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <Surface className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">{isRtl ? 'المعاينة الحية' : 'Live preview'}</p><h3 className="mt-1 text-lg font-extrabold">{page?.title ?? profile.displayName}</h3></div><span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${profile.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${profile.published ? 'bg-emerald-500' : 'bg-amber-500'}`} />{profile.published ? (isRtl ? 'منشور' : 'Published') : (isRtl ? 'مسودة' : 'Draft')}</span></div>
        <div className="bg-slate-100/80 p-4 sm:p-8">
          <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[2rem] border border-white/80 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-6" style={{ backgroundColor: profile.theme.background, color: profile.theme.text, backgroundImage: profile.theme.backgroundImage ? `url(${profile.theme.backgroundImage})` : undefined }}>
            <div className="rounded-[1.5rem] p-5 shadow-sm sm:p-6" style={{ backgroundColor: profile.theme.card }} dir={isRtl ? 'rtl' : 'ltr'}>
              <header className="text-center"><img src={profile.avatarUrl} alt="" className="mx-auto h-20 w-20 rounded-full border-4 border-white object-cover shadow-md" /><h4 className="mt-4 text-xl font-extrabold">{profile.displayName}</h4><p className="mt-1 text-xs font-bold" style={{ color: accent }}>{isRtl ? profile.roleAr : profile.role}</p><p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed" style={{ color: profile.theme.mutedText }}>{isRtl ? profile.bioAr : profile.bio}</p></header>
              <section className="mt-6 space-y-3" aria-label={page?.title ?? 'Preview'}>{page?.blocks.map((block) => <ProfileBlockView key={block.id} block={block} locale={locale} accent={accent} />)}</section>
              <p className="mt-5 text-center text-[10px] font-bold" style={{ color: profile.theme.mutedText }}>raloa.app/@{profile.username}</p>
            </div>
          </div>
        </div>
      </Surface>

      <div className="space-y-5">
        <Surface className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Globe2 className="h-5 w-5" /></span><div><h3 className="text-sm font-extrabold">{isRtl ? 'صفحتك العامة' : 'Your public page'}</h3><p className="mt-0.5 text-xs text-slate-500">{isRtl ? 'هذا هو الرابط الذي ستشاركه.' : 'This is the link you will share.'}</p></div></div><div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2"><code className="min-w-0 flex-1 truncate px-2 text-xs text-slate-600">{publicUrl}</code><button type="button" onClick={copyUrl} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-indigo-600" aria-label={copied ? 'Copied' : 'Copy public URL'}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" variant="secondary" onClick={copyUrl}><Share2 className="h-4 w-4" />{copied ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'مشاركة' : 'Share')}</Button><Button size="sm" variant="secondary" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" />{isRtl ? 'فتح' : 'Open'}</Button></div></Surface>
        <Surface className="p-5"><h3 className="text-sm font-extrabold">{isRtl ? 'حالة النشر' : 'Publishing status'}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{profile.published ? (isRtl ? 'صفحتك متاحة للزوار.' : 'Your page is available to visitors.') : (isRtl ? 'صفحتك خاصة حتى تنشرها.' : 'Your page stays private until you publish it.')}</p><Button className="mt-4 w-full" onClick={publish} disabled={isPublishing}>{isPublishing ? (isRtl ? 'جارٍ النشر...' : 'Publishing…') : profile.published ? (isRtl ? 'نشر التغييرات' : 'Publish changes') : (isRtl ? 'نشر الصفحة' : 'Publish page')}</Button><p className="mt-3 text-center text-[11px] text-slate-500">{isRtl ? 'يحفظ هذا التغيير على هذا الجهاز في الوضع التجريبي.' : 'Demo mode: publication is saved locally on this device.'}</p></Surface>
      </div>
    </div>
  );
};
