import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Maximize2, Minimize2, Monitor, RefreshCw, Share2, Smartphone, Tablet } from 'lucide-react';
import type { Locale } from '../../types';
import type { ProfilePage, PublicProfile } from '../../services';
import { useRepository } from '../../services/RepositoryContext';
import { deviceFrames, type DeviceKey } from '../../design/tokens';
import { copyTextToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { Tabs } from '../ui/Tabs';
import { ProfileView } from '../profile/ProfileView';
import { ui, text, tx } from '../../i18n/ui';

interface StudioPreviewWorkspaceProps {
  profile: PublicProfile;
  page: ProfilePage | null;
  locale: Locale;
  onPublish: () => void;
  onReload: () => void;
}

const DEVICES: Array<{ key: DeviceKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'mobile', icon: Smartphone },
  { key: 'tablet', icon: Tablet },
  { key: 'desktop', icon: Monitor }
];

export const StudioPreviewWorkspace: React.FC<StudioPreviewWorkspaceProps> = ({ profile, page, locale, onPublish, onReload }) => {
  const repository = useRepository();
  const isRtl = locale === 'ar';
  const [device, setDevice] = useState<DeviceKey>('mobile');
  const [zoom, setZoom] = useState(deviceFrames.mobile.scaleOptions[1] ?? 0.75);
  const [fullScreen, setFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const publicUrl = `${window.location.origin}/p/${profile.username}${page && page.slug !== 'links' ? `/${page.slug}` : ''}`;
  const frame = deviceFrames[device];

  const share = async () => {
    const title = text(profile.seo.title, locale, profile.displayName);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: publicUrl });
        return;
      } catch {
        // The user dismissing the share sheet is not an error; fall through to the clipboard.
      }
    }
    setCopied(await copyTextToClipboard(publicUrl));
    window.setTimeout(() => setCopied(false), 1800);
  };

  const body = useMemo(() => {
    if (!page) return null;
    return (
      <div
        key={previewKey}
        className="mx-auto"
        style={{ width: frame.width, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        <div
          className={frame.chrome === 'notch' ? 'overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-raised' : 'overflow-hidden rounded-panel border border-slate-200 bg-white shadow-raised'}
          style={{ height: frame.height * zoom }}
        >
          <ProfileView profile={profile} page={page} locale={locale} variant="preview" pages={[page]} />
        </div>
      </div>
    );
  }, [frame.chrome, frame.height, frame.width, locale, page, previewKey, profile, zoom]);

  const panel = (
    <div className={fullScreen ? 'fixed inset-0 z-50 flex flex-col bg-slate-900/95 p-4' : ''}>
      <Surface className={`min-w-0 overflow-hidden ${fullScreen ? 'flex-1' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">{tx(ui.studio.previewSynced, locale)}</p>
            <h3 className="mt-0.5 truncate text-base font-extrabold">{page ? text(page.title, locale) : profile.displayName}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              ariaLabel={tx(ui.studio.deviceMobile, locale)}
              variant="segment"
              value={device}
              onChange={(id) => {
                setDevice(id as DeviceKey);
                setZoom(deviceFrames[id as DeviceKey].scaleOptions[1] ?? 0.6);
              }}
              items={DEVICES.map(({ key, icon }) => ({ id: key, label: tx(deviceFrames[key].label, locale), icon }))}
            />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className={fullScreen ? 'text-slate-200' : ''}>{tx(ui.studio.zoom, locale)}</span>
              <input
                type="range"
                min={frame.scaleOptions[0]}
                max={1}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-9 w-24 accent-indigo-600"
                aria-label={tx(ui.studio.zoom, locale)}
              />
              <span className="w-9 tabular-nums">{Math.round(zoom * 100)}%</span>
            </label>
            <IconToggle
              label={fullScreen ? tx(ui.studio.exitFullScreen, locale) : tx(ui.studio.fullScreen, locale)}
              onClick={() => setFullScreen((current) => !current)}
              tone={fullScreen ? 'dark' : 'light'}
            >
              {fullScreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            </IconToggle>
            <IconToggle
              label={tx(ui.studio.refreshPreview, locale)}
              tone={fullScreen ? 'dark' : 'light'}
              onClick={() => {
                setPreviewKey((current) => current + 1);
                onReload();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </IconToggle>
          </div>
        </div>
        <div className={`overflow-auto p-4 sm:p-6 ${fullScreen ? 'h-[calc(100%-4.5rem)] bg-slate-800/60' : 'bg-slate-100/80'}`}>
          {body ?? <p className="text-sm text-slate-500">{tx(ui.editor.emptyPage, locale)}</p>}
        </div>
      </Surface>
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      {panel}

      <div className="space-y-5">
        <Surface className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-indigo-50 text-indigo-600">
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold">{tx(ui.studio.yourPublicPage, locale)}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{tx(ui.studio.shareLinkHelp, locale)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-control border border-slate-200 bg-surface-alt p-2">
            <code className="min-w-0 flex-1 truncate px-1 text-xs text-slate-600" dir="ltr">
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={async () => {
                setCopied(await copyTextToClipboard(publicUrl));
                window.setTimeout(() => setCopied(false), 1800);
              }}
              aria-label={copied ? tx(ui.common.copied, locale) : tx(ui.common.copy, locale)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-indigo-600"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => void share()}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {isRtl ? 'مشاركة' : 'Share'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {tx(ui.common.open, locale)}
            </Button>
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.studio.publishChanges, locale)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {profile.published ? tx(ui.studio.publishedToastBody, locale) : tx(ui.common.demoNote, locale)}
          </p>
          <Button className="mt-4 w-full" onClick={onPublish} disabled={!page}>
            {profile.published ? tx(ui.studio.publishChanges, locale) : tx(ui.studio.publishPage, locale)}
          </Button>
          <p className="mt-3 text-center text-2xs text-slate-500">
            {isRtl ? 'وضع تجريبي: النشر يحفظ على هذا الجهاز.' : 'Demo mode: publishing is stored on this device.'}
          </p>
        </Surface>
      </div>
    </div>
  );
};

const IconToggle: React.FC<{
  label: string;
  onClick: () => void;
  tone: 'light' | 'dark';
  children: React.ReactNode;
}> = ({ label, onClick, tone, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
      tone === 'dark' ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

/** Real encoder (no image service, no mock squares) so a phone can scan the preview. */
