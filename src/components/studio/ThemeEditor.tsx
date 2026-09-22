import React, { useMemo } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { Locale } from '../../types';
import type { ThemeConfig, ThemeRadius, ThemeShadow } from '../../services/contracts/theme';
import { RADIUS_PX } from '../../services/contracts/theme';
import { themePresets } from '../../theme/themeRegistry';
import { CONTRAST_MINIMUM, contrastRatio } from '../../design/tokens';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Surface } from '../ui/Surface';
import { ui, text, tx } from '../../i18n/ui';

interface ThemeEditorProps {
  theme: ThemeConfig;
  locale: Locale;
  onChange: (theme: ThemeConfig) => void;
  onReset: () => void;
}

const MAX_CUSTOM_CSS = 4000;
const UNSAFE_CSS = /<\/?style|javascript:|expression\s*\(|@import|url\s*\(\s*["']?(?:data:|javascript:)/i;

const FONT_CHOICES = ['Inter', 'Cairo', 'Georgia', 'system-ui', 'ui-serif', 'ui-monospace'];

const colorInput = (key: keyof ThemeConfig, label: string, theme: ThemeConfig, apply: (patch: Partial<ThemeConfig>) => void) => (
  <span className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
    <span className="flex items-center gap-2">
      <input
        type="color"
        value={String(theme[key] ?? '#FFFFFF')}
        onChange={(event) => apply({ [key]: event.target.value } as Partial<ThemeConfig>)}
        className="h-11 w-14 shrink-0 cursor-pointer rounded-control border border-slate-300 bg-white p-1"
        aria-label={label}
      />
      <input
        value={String(theme[key] ?? '')}
        onChange={(event) => apply({ [key]: event.target.value } as Partial<ThemeConfig>)}
        className="min-h-11 w-full rounded-control border border-slate-300 px-3 text-sm font-bold uppercase outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
        aria-label={`${label} hex`}
      />
    </span>
  </span>
);

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ theme, locale, onChange, onReset }) => {
  const isRtl = locale === 'ar';
  const apply = (patch: Partial<ThemeConfig>) => onChange({ ...theme, ...patch });

  const cssProblem = useMemo(() => {
    const css = theme.customCss ?? '';
    if (!css) return null;
    if (css.length > MAX_CUSTOM_CSS) return `${MAX_CUSTOM_CSS - css.length < 0 ? tx(ui.theme.customCss, locale) : ''}`;
    if (UNSAFE_CSS.test(css)) return tx(ui.theme.unsafeCss, locale);
    return null;
  }, [theme.customCss, locale]);

  const bodyContrast = contrastRatio(theme.mutedText, theme.card);
  const titleContrast = contrastRatio(theme.text, theme.card);
  const weakest = Math.min(bodyContrast, titleContrast);
  const weak = weakest > 0 && weakest < CONTRAST_MINIMUM.body;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Surface className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold">{tx(ui.theme.heading, locale)}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{tx(ui.theme.presets, locale)}</p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="flex min-h-10 items-center gap-2 rounded-pill border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {tx(ui.theme.reset, locale)}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {themePresets.map((preset) => {
              const active = preset.id === theme.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ ...preset, customCss: theme.customCss, backgroundImage: theme.backgroundImage, backgroundVideo: theme.backgroundVideo, overlay: theme.overlay, branding: theme.branding })}
                  aria-pressed={active}
                  className={`relative min-h-20 overflow-hidden rounded-panel border p-3 text-start transition ${
                    active ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: preset.background }}
                >
                  <span className="block truncate text-xs font-extrabold" style={{ color: preset.text }}>
                    {preset.id}
                  </span>
                  <span className="mt-2 flex gap-1">
                    {[preset.card, preset.accent, preset.text].map((color, index) => (
                      <span key={`${preset.id}-${index}`} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span className="mt-2 block h-2 rounded-pill" style={{ backgroundColor: preset.accent, width: '60%' }} />
                  {active && <Check className="absolute end-2 top-2 h-4 w-4 text-indigo-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.colors, locale)}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {colorInput('background', tx(ui.theme.background, locale), theme, apply)}
            {colorInput('card', tx(ui.theme.cards, locale), theme, apply)}
            {colorInput('text', tx(ui.theme.text, locale), theme, apply)}
            {colorInput('mutedText', isRtl ? 'نص ثانوي' : 'Muted text', theme, apply)}
            {colorInput('accent', tx(ui.theme.accent, locale), theme, apply)}
          </div>
          {weak && (
            <p className="mt-4 rounded-control bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              {tx(ui.theme.contrastWarning, locale).replace('{ratio}', weakest.toFixed(2))}
            </p>
          )}
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.shape, locale)}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label={tx(ui.theme.buttonRadius, locale)}
              value={theme.button.radius}
              onChange={(event) => apply({ button: { ...theme.button, radius: event.target.value as ThemeRadius } })}
              options={radiusOptions(locale)}
            />
            <Select
              label={tx(ui.theme.cardRadius, locale)}
              value={theme.cardStyle?.radius ?? 'lg'}
              onChange={(event) => apply({ cardStyle: { ...(theme.cardStyle ?? { border: 'soft', shadow: 'soft' }), radius: event.target.value as ThemeRadius } })}
              options={radiusOptions(locale)}
            />
            <Select
              label={`${tx(ui.theme.buttonStyle, locale)} · ${tx(ui.theme.shadow, locale)}`}
              value={theme.button.variant}
              onChange={(event) => apply({ button: { ...theme.button, variant: event.target.value as ThemeConfig['button']['variant'] } })}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'soft', label: 'Soft' },
                { value: 'outline', label: 'Outline' }
              ]}
            />
            <Select
              label={tx(ui.theme.shadow, locale)}
              value={theme.button.shadow}
              onChange={(event) => apply({ button: { ...theme.button, shadow: event.target.value as ThemeShadow } })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'soft', label: 'Soft' },
                { value: 'strong', label: 'Strong' }
              ]}
            />
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.backgroundMedia, locale)}</h3>
          <div className="mt-4 space-y-4">
            <Input
              label={tx(ui.theme.backgroundImage, locale)}
              value={theme.backgroundImage ?? ''}
              placeholder="https://"
              onChange={(event) => apply({ backgroundImage: event.target.value || undefined })}
            />
            <Input
              label={tx(ui.theme.backgroundVideo, locale)}
              value={theme.backgroundVideo ?? ''}
              placeholder="https://"
              onChange={(event) => apply({ backgroundVideo: event.target.value || undefined })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField
                label={tx(ui.theme.opacity, locale)}
                value={theme.overlay?.opacity ?? 0}
                onChange={(value) => apply({ overlay: { opacity: value, blur: theme.overlay?.blur ?? 0 } })}
              />
              <RangeField
                label={tx(ui.theme.blur, locale)}
                value={theme.overlay?.blur ?? 0}
                max={20}
                onChange={(value) => apply({ overlay: { opacity: theme.overlay?.opacity ?? 0, blur: value } })}
              />
            </div>
          </div>
        </Surface>
      </div>

      <div className="space-y-4">
        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.typography, locale)}</h3>
          <div className="mt-4 space-y-4">
            <Select
              label={tx(ui.theme.fontFamily, locale)}
              value={theme.typography.family}
              onChange={(event) => apply({ typography: { ...theme.typography, family: event.target.value } })}
              options={FONT_CHOICES.map((family) => ({ value: family, label: family }))}
            />
            <RangeField
              label={tx(ui.theme.weight, locale)}
              value={theme.typography.weight}
              min={300}
              max={900}
              step={100}
              suffix=""
              onChange={(value) => apply({ typography: { ...theme.typography, weight: value } })}
            />
            <Select
              label={tx(ui.theme.scale, locale)}
              value={theme.typography.scale}
              onChange={(event) => apply({ typography: { ...theme.typography, scale: event.target.value as ThemeConfig['typography']['scale'] } })}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'large', label: 'Large' }
              ]}
            />
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.branding, locale)}</h3>
          <div className="mt-4 space-y-3">
            <Switch
              checked={theme.branding?.showFooter !== false}
              onChange={(checked) => apply({ branding: { showLogo: theme.branding?.showLogo ?? false, showFooter: checked } })}
              label={tx(ui.theme.showFooter, locale)}
            />
            <Switch
              checked={theme.branding?.showLogo ?? false}
              onChange={(checked) => apply({ branding: { showLogo: checked, showFooter: theme.branding?.showFooter !== false } })}
              label={tx(ui.theme.showLogo, locale)}
            />
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h3 className="text-sm font-extrabold">{tx(ui.theme.customCss, locale)}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{tx(ui.theme.customCssHelp, locale)}</p>
          <div className="mt-3">
            <Textarea
              dir="ltr"
              rows={7}
              className="font-mono text-xs"
              value={theme.customCss ?? ''}
              counter={{ value: (theme.customCss ?? '').length, max: MAX_CUSTOM_CSS }}
              onChange={(event) => apply({ customCss: event.target.value.slice(0, MAX_CUSTOM_CSS + 1) || undefined })}
              error={cssProblem ?? undefined}
              aria-label={tx(ui.theme.customCss, locale)}
            />
          </div>
        </Surface>

        <Surface className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{tx(ui.theme.shadow, locale)}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{text({ en: 'Changes apply to the preview instantly.', ar: 'تسري التعديلات على المعاينة فوراً.' }, locale)}</p>
        </Surface>
      </div>
    </div>
  );
};

const radiusOptions = (locale: Locale) =>
  (Object.keys(RADIUS_PX) as ThemeRadius[]).map((key) => ({
    value: key,
    label: `${key}${locale === 'ar' ? '' : ` · ${RADIUS_PX[key]}`}`
  }));

const RangeField: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min = 0, max = 1, step = 0.05, suffix = '', onChange }) => (
  <label className="block text-start">
    <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
      <span>{label}</span>
      <span className="tabular-nums text-slate-500">
        {value}
        {suffix}
      </span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-11 w-full accent-indigo-600"
    />
  </label>
);
