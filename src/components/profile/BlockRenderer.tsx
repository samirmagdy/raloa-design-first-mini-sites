import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Instagram,
  Link2,
  LockKeyhole,
  Mail,
  MapPin,
  Music2,
  Play,
  Send,
  Star,
  Tag,
  Video,
  Volume2
} from 'lucide-react';
import { Locale } from '../../types';
import { BlockDataValue, BlockType, ProfileBlock } from '../../services/repository';

export interface BlockRendererProps {
  block: ProfileBlock;
  locale: Locale;
  accent: string;
}

export const blockRegistry: Array<{ type: BlockType; label: string; category: string }> = [
  { type: 'link', label: 'Link', category: 'Essentials' },
  { type: 'section', label: 'Section header', category: 'Essentials' },
  { type: 'folder', label: 'Link folder', category: 'Essentials' },
  { type: 'rich-text', label: 'Rich text', category: 'Essentials' },
  { type: 'spacer', label: 'Spacer', category: 'Essentials' },
  { type: 'image', label: 'Image', category: 'Media' },
  { type: 'gallery', label: 'Image gallery', category: 'Media' },
  { type: 'carousel', label: 'Image carousel', category: 'Media' },
  { type: 'audio', label: 'Audio player', category: 'Media' },
  { type: 'mp3', label: 'MP3 player', category: 'Media' },
  { type: 'video', label: 'Video', category: 'Media' },
  { type: 'direct-video', label: 'Direct video', category: 'Media' },
  { type: 'youtube', label: 'YouTube', category: 'Embeds' },
  { type: 'vimeo', label: 'Vimeo', category: 'Embeds' },
  { type: 'tiktok', label: 'TikTok', category: 'Embeds' },
  { type: 'spotify', label: 'Spotify', category: 'Embeds' },
  { type: 'apple-music', label: 'Apple Music', category: 'Embeds' },
  { type: 'soundcloud', label: 'SoundCloud', category: 'Embeds' },
  { type: 'newsletter', label: 'Newsletter', category: 'Conversion' },
  { type: 'contact-form', label: 'Contact form', category: 'Conversion' },
  { type: 'faq', label: 'FAQ', category: 'Conversion' },
  { type: 'testimonial', label: 'Testimonial', category: 'Conversion' },
  { type: 'calendly', label: 'Calendly', category: 'Conversion' },
  { type: 'file-download', label: 'File download', category: 'Conversion' },
  { type: 'location', label: 'Location', category: 'Conversion' },
  { type: 'event', label: 'Event', category: 'Conversion' },
  { type: 'music-pre-save', label: 'Music pre-save', category: 'Conversion' },
  { type: 'phone', label: 'Phone', category: 'Contact' },
  { type: 'email', label: 'Email', category: 'Contact' },
  { type: 'product', label: 'Product', category: 'Commerce' },
  { type: 'map', label: 'Map', category: 'Commerce' },
  { type: 'instagram-grid', label: 'Instagram grid', category: 'Social' },
  { type: 'password-gate', label: 'Password gate', category: 'Advanced' } as { type: BlockType; label: string; category: string },
  { type: 'scheduled', label: 'Scheduled block', category: 'Advanced' },
  { type: 'highlighted', label: 'Highlighted block', category: 'Advanced' },
  { type: 'hidden', label: 'Hidden block', category: 'Advanced' },
  { type: 'badge', label: 'Block badge', category: 'Advanced' },
  { type: 'icon', label: 'Block icon', category: 'Advanced' }
];

const dataString = (block: ProfileBlock, key: string, fallback = '') => {
  const value = block.data?.[key];
  return typeof value === 'string' ? value : fallback;
};

const dataNumber = (block: ProfileBlock, key: string, fallback = 0) => {
  const value = block.data?.[key];
  return typeof value === 'number' ? value : fallback;
};

const dataStrings = (block: ProfileBlock, key: string) => {
  const value = block.data?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const safeUrl = (url: string) => /^(https?:|mailto:|tel:|#)/i.test(url);
const embedUrl = (block: ProfileBlock) => dataString(block, 'embedUrl', block.url || '');
const allowedEmbed = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'spotify.com', 'soundcloud.com', 'music.apple.com'].some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
};

const sanitizeRichText = (value: string) => value
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
  .replace(/javascript:/gi, '');

const FormBlock: React.FC<{ block: ProfileBlock; locale: Locale; type: 'newsletter' | 'contact-form'; accent: string }> = ({ block, locale, type, accent }) => {
  const [submitted, setSubmitted] = useState(false);
  const isRtl = locale === 'ar';
  if (submitted) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-800">{isRtl ? 'تم استلام طلبك في الوضع التجريبي.' : 'Thanks — your demo submission was received.'}</div>;
  return (
    <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm">
      <h3 className="text-base font-extrabold text-slate-900">{block.title || (type === 'newsletter' ? (isRtl ? 'اشترك في النشرة' : 'Join the newsletter') : (isRtl ? 'تواصل معي' : 'Get in touch'))}</h3>
      {block.subtitle && <p className="mt-1 text-sm text-slate-600">{block.subtitle}</p>}
      <div className="mt-4 space-y-3">
        {type === 'contact-form' && <input required placeholder={isRtl ? 'الاسم' : 'Name'} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" />}
        <input required type="email" placeholder={isRtl ? 'البريد الإلكتروني' : 'Email address'} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" />
        {type === 'contact-form' && <textarea required rows={3} placeholder={isRtl ? 'رسالتك' : 'Your message'} className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" />}
        <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" style={{ backgroundColor: accent }}>
          <Send className="h-4 w-4" aria-hidden="true" />{isRtl ? 'إرسال' : type === 'newsletter' ? 'Subscribe' : 'Send message'}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{isRtl ? 'وضع تجريبي — لا يتم إرسال البيانات.' : 'Demo mode — no data is sent.'}</p>
    </form>
  );
};

const EmbedBlock: React.FC<{ block: ProfileBlock; label: string }> = ({ block, label }) => {
  const url = embedUrl(block);
  if (!url || !allowedEmbed(url)) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{label} embed URL is unavailable.</div>;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><iframe src={url} title={block.title || label} className="h-64 w-full border-0" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" /></div>;
};

export const ProfileBlockView: React.FC<BlockRendererProps> = ({ block, locale, accent }) => {
  const isRtl = locale === 'ar';
  if (block.type === 'hidden' || !block.visible) return null;
  const title = block.title || (isRtl ? 'رابط' : 'Open link');
  const subtitle = block.subtitle;

  if (block.type === 'spacer') return <div aria-hidden="true" className="h-5" />;
  if (block.type === 'section') return <h2 className="px-1 pt-3 text-start text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</h2>;
  if (block.type === 'badge') return <div className="flex justify-center"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"><Tag className="h-3.5 w-3.5" style={{ color: accent }} />{title}</span></div>;
  if (block.type === 'icon') return <div className="flex justify-center" aria-label={title}><span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}18`, color: accent }}><Link2 className="h-6 w-6" /></span></div>;
  if (block.type === 'rich-text') return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-start text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.content || block.subtitle || '') }} />;
  if (block.type === 'folder') return <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-extrabold text-slate-900 [&::-webkit-details-marker]:hidden"><span>{title}</span><span className="text-slate-400 transition group-open:rotate-45">+</span></summary><div className="mt-3 space-y-3 border-t border-slate-100 pt-3">{block.children?.map((child) => <ProfileBlockView key={child.id} block={child} locale={locale} accent={accent} />)}</div></details>;
  if (block.type === 'newsletter' || block.type === 'contact-form') return <FormBlock block={block} locale={locale} type={block.type} accent={accent} />;
  if (['spotify', 'apple-music', 'soundcloud', 'youtube', 'vimeo', 'tiktok'].includes(block.type)) return <EmbedBlock block={block} label={block.type} />;
  if (block.type === 'audio' || block.type === 'mp3') return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Volume2 className="h-4 w-4" style={{ color: accent }} />{title}</div><audio className="w-full" controls src={dataString(block, 'audioUrl', block.url)} /></div>;
  if (block.type === 'image') return <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><img src={dataString(block, 'imageUrl', block.url)} alt={dataString(block, 'alt', title)} className="h-auto max-h-[32rem] w-full object-cover" loading="lazy" />{subtitle && <figcaption className="p-3 text-xs text-slate-500">{subtitle}</figcaption>}</figure>;
  if (block.type === 'gallery' || block.type === 'carousel' || block.type === 'instagram-grid') {
    const images = dataStrings(block, 'images');
    return <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${title} ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />)}</div>;
  }
  if (block.type === 'video' || block.type === 'direct-video') return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm"><video className="max-h-[32rem] w-full" controls poster={dataString(block, 'poster')} src={dataString(block, 'videoUrl', block.url)} /></div>;
  if (block.type === 'faq') return <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="flex min-h-11 cursor-pointer items-center justify-between font-bold text-slate-900">{title}<span className="text-slate-400">+</span></summary><p className="border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">{block.content || subtitle}</p></details>;
  if (block.type === 'testimonial') return <blockquote className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm"><div className="mb-3 flex gap-1 text-amber-400">{[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-4 w-4 fill-current" />)}</div><p className="text-sm leading-relaxed text-slate-700">“{block.content || subtitle}”</p><cite className="mt-3 block text-xs font-bold not-italic text-slate-500">{title}</cite></blockquote>;
  if (block.type === 'product') return <article className="rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}><Tag className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold">{title}</h3><p className="text-xs text-slate-500">{subtitle}</p></div><strong className="text-sm">{dataString(block, 'price')}</strong></div><a href={safeUrl(block.url || '') ? block.url : '#'} className="mt-3 flex min-h-11 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: accent }}>{isRtl ? 'عرض المنتج' : 'View product'}</a></article>;
  if (block.type === 'phone' || block.type === 'email') return <a href={block.type === 'phone' ? `tel:${block.url || ''}` : `mailto:${block.url || ''}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>{block.type === 'phone' ? <Send className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</span><span><strong className="block text-sm">{title}</strong><span className="text-xs text-slate-500">{block.url}</span></span></a>;
  if (block.type === 'file-download') return <a href={safeUrl(block.url || '') ? block.url : '#'} download className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"><FileText className="h-5 w-5" style={{ color: accent }} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="text-xs text-slate-500">{subtitle}</span></span><Download className="h-4 w-4 text-slate-400" /></a>;
  if (block.type === 'location' || block.type === 'map') return <a href={safeUrl(block.url || '') ? block.url : '#'} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"><MapPin className="h-5 w-5" style={{ color: accent }} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="text-xs text-slate-500">{subtitle}</span></span><ExternalLink className="h-4 w-4 text-slate-400" /></a>;
  if (block.type === 'event') return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm"><CalendarDays className="h-5 w-5" style={{ color: accent }} /><h3 className="mt-3 text-base font-extrabold">{title}</h3><p className="mt-1 text-sm text-slate-600">{subtitle}</p><p className="mt-3 text-xs font-bold text-slate-500">{dataString(block, 'date')}</p></div>;
  if (block.type === 'calendly' || block.type === 'music-pre-save') return <a href={safeUrl(block.url || '') ? block.url : '#'} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"><CalendarDays className="h-5 w-5" style={{ color: accent }} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="text-xs text-slate-500">{subtitle}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></a>;
  if (block.type === 'scheduled') {
    const start = dataString(block, 'startsAt');
    const end = dataString(block, 'endsAt');
    const now = Date.now();
    if ((start && now < Date.parse(start)) || (end && now > Date.parse(end))) return null;
  }
  if (block.type === 'highlighted') return <div className="rounded-2xl p-1" style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}><div className="rounded-[0.9rem] bg-white p-1"><ProfileBlockView block={{ ...block, type: 'link' }} locale={locale} accent={accent} /></div></div>;
  if (block.type === 'password-gate') return <PasswordGate block={block} locale={locale} accent={accent} />;

  return (
    <a href={safeUrl(block.url || '') ? block.url : '#'} target={block.url?.startsWith('http') ? '_blank' : undefined} rel={block.url?.startsWith('http') ? 'noreferrer' : undefined} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 text-start shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}><Link2 className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-slate-900">{title}</strong>{subtitle && <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" aria-hidden="true" />
    </a>
  );
};

const PasswordGate: React.FC<{ block: ProfileBlock; locale: Locale; accent: string }> = ({ block, locale, accent }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const expected = dataString(block, 'password', 'raloa-demo');
  if (unlocked) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-800"><Check className="mx-auto mb-2 h-5 w-5" />{block.content || (locale === 'ar' ? 'تم فتح المحتوى التجريبي.' : 'Demo content unlocked.')}</div>;
  return <form onSubmit={(event) => { event.preventDefault(); if (password === expected) setUnlocked(true); }} className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm"><LockKeyhole className="h-5 w-5" style={{ color: accent }} /><h3 className="mt-3 text-sm font-extrabold">{block.title || (locale === 'ar' ? 'محتوى محمي' : 'Protected content')}</h3><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={locale === 'ar' ? 'كلمة المرور' : 'Password'} className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" /><button className="mt-3 min-h-11 w-full rounded-xl text-sm font-bold text-white" style={{ backgroundColor: accent }}>{locale === 'ar' ? 'فتح المحتوى' : 'Unlock'}</button><p className="mt-2 text-[11px] text-slate-500">{locale === 'ar' ? 'وضع تجريبي' : 'Demo mode'}</p></form>;
};

