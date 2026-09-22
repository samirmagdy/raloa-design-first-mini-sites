import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Mail,
  Link2,
  Github
} from 'lucide-react';
import { TemplateItem } from '../types';
import { RaloaMark } from './brand/RaloaLogo';

interface PhoneMockupProps {
  template: TemplateItem;
  className?: string;
  isRtl?: boolean;
  interactive?: boolean;
  onOpenAction?: (type: 'portfolio' | 'booking' | 'shop' | 'gear', data?: any) => void;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  template,
  className = '',
  isRtl = false,
  interactive = true,
  onOpenAction
}) => {
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const handleLinkClick = (link: typeof template.sampleLinks[0], e: React.MouseEvent) => {
    e.preventDefault();
    if (!interactive) return;
    setClickedItem(link.id);
    setTimeout(() => setClickedItem(null), 350);

    if (onOpenAction) {
      if (link.type === 'gallery') onOpenAction('portfolio', link);
      else if (link.type === 'booking') onOpenAction('booking', link);
      else if (link.type === 'shop') onOpenAction('shop', link);
      else onOpenAction('gear', link);
    }
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[295px] sm:max-w-[320px] md:max-w-[340px] bg-ink rounded-[48px] p-3 shadow-[0_28px_70px_rgba(15,23,42,0.24)] border-[6px] select-none transition-transform duration-300 hover:scale-[1.01] raloa-phone-mockup raloa-template-skin-${template.id} ${className}`}
      style={{ borderColor: template.themeColor }}
      data-template-id={template.id}
    >
      {/* Screen Frame */}
      <div className="relative bg-surface-alt rounded-[38px] overflow-hidden flex flex-col min-h-[580px] max-h-[640px] shadow-inner text-slate-800 raloa-phone-screen">
        
        {/* Dynamic Island & Status Bar */}
        <div className="pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-semibold text-slate-900 z-20 phone-status-bar">
          <span>9:41</span>
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-800 ml-auto mr-2" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-4 h-2.5 border border-slate-700 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-slate-900 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2 pb-6 flex flex-col items-center text-center">
          <div className="raloa-template-cover relative w-[calc(100%+2rem)] -mx-4 h-16 overflow-hidden">
            <img src={template.coverImage} alt="" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-[#F8FAFC]" />
          </div>
          
          {/* Avatar with verified badge */}
          <div className="relative mt-1 mb-3 z-10">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md">
              <img
                src={template.avatar}
                alt={template.name}
                className="w-full h-full object-cover object-[center_20%] rounded-full bg-slate-100"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-600 text-white" />
            </div>
          </div>

          {/* Name & Titles */}
          <p className="font-extrabold text-[18px] text-slate-900 tracking-tight leading-tight">
            {template.name}
          </p>
          <p className="text-[12px] font-medium text-slate-500 mt-1">
            {isRtl ? template.roleAr : template.role}
          </p>
          <p className="text-[11px] text-slate-600 mt-1 px-4 leading-relaxed max-w-[260px]">
            {isRtl ? template.bioAr : template.bio}
          </p>

          {/* Social Icons Strip */}
          <div className="flex items-center justify-center gap-2 mt-3.5 mb-4">
            {template.socials.map((social) => {
              const labels: Record<TemplateItem['socials'][number]['platform'], string> = {
                instagram: 'Instagram',
                x: 'Twitter X',
                youtube: 'YouTube',
                linkedin: 'LinkedIn',
                email: 'Email',
                tiktok: 'TikTok',
                github: 'GitHub',
                spotify: 'Spotify'
              };
              const icons: Record<TemplateItem['socials'][number]['platform'], React.ReactNode> = {
                instagram: <img src="/brand/trusted/instagram.svg" alt="" aria-hidden="true" className="w-4 h-4" />,
                x: <img src="/brand/trusted/x.svg" alt="" aria-hidden="true" className="w-4 h-4" />,
                youtube: <img src="/brand/trusted/youtube.svg" alt="" aria-hidden="true" className="w-4 h-4" />,
                linkedin: <img src="/brand/trusted/linkedin.svg" alt="" aria-hidden="true" className="w-4 h-4" />,
                email: <Mail className="w-3.5 h-3.5" />,
                tiktok: <img src="/brand/trusted/tiktok.svg" alt="" aria-hidden="true" className="w-4 h-4" />,
                github: <Github className="w-3.5 h-3.5" />,
                spotify: <img src="/brand/trusted/spotify.svg" alt="" aria-hidden="true" className="w-4 h-4" />
              };
              return (
                <a
                  key={`${social.platform}-${social.url}`}
                  href={social.url}
                  target={social.url.startsWith('mailto:') ? undefined : '_blank'}
                  rel={social.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  aria-label={labels[social.platform]}
                  className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {icons[social.platform]}
                </a>
              );
            })}
          </div>

          {/* Mini-site interactive links */}
          <div className="w-full space-y-2.5 mt-1">
            {template.sampleLinks.map((link) => {
              const isClicked = clickedItem === link.id;
              return (
                <button
                  key={link.id}
                  onClick={(e) => handleLinkClick(link, e)}
                  type="button"
                  className={`w-full p-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center gap-3 transition-all duration-200 text-left rtl:text-right group shadow-[0_2px_8px_rgba(15,23,42,0.04)] cursor-pointer ${
                    isClicked ? 'scale-[0.98] ring-2 ring-indigo-500' : 'hover:scale-[1.01]'
                  }`}
                >
                  {link.thumbnail ? (
                    <img
                      src={link.thumbnail}
                      alt={link.title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-100"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Link2 className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px] text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {isRtl ? link.titleAr : link.title}
                      </span>
                    </div>
                    {(link.subtitle || link.subtitleAr) && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {isRtl ? link.subtitleAr : link.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 flex items-center justify-center shrink-0 transition-colors rtl:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Hint */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isRtl ? 'اضغط على الروابط لتجربة التفاعل المباشر' : 'Tap links to test live interactions'}</span>
          </div>

          {/* Bottom badge */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 tracking-wider">
            <RaloaMark size={14} theme="monochrome-black" />
            <span>raloa.app/@{template.name.toLowerCase()}</span>
          </div>
        </div>

        {/* iPhone Home Bar */}
        <div className="py-2 flex justify-center bg-surface-alt">
          <div className="w-28 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
