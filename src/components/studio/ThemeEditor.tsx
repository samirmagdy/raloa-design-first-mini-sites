import React from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import { ThemeConfig } from '../../services/repository';
import { themePresets } from '../../theme/themeRegistry';
import { Button } from '../ui/Button';

interface ThemeEditorProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
  onSave?: () => void;
  onReset?: () => void;
  locale?: 'en' | 'ar';
}

const update = (theme: ThemeConfig, patch: Partial<ThemeConfig>): ThemeConfig => ({ ...theme, ...patch });

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ theme, onChange, onSave, onReset, locale = 'en' }) => {
  const isRtl = locale === 'ar';
  const set = (patch: Partial<ThemeConfig>) => onChange(update(theme, patch));
  const setColor = (key: 'background' | 'card' | 'text' | 'accent', value: string) => {
    onChange({ ...theme, [key]: value });
  };
  const customCssWarning = theme.customCss && (theme.customCss.length > 4000 || /<\/?style|javascript:|expression\s*\(|@import/i.test(theme.customCss))
    ? (isRtl ? 'يحتوي CSS المخصص على قاعدة غير مدعومة أو غير آمنة.' : 'Custom CSS contains an unsupported or unsafe rule.')
    : null;
  const labels = isRtl
    ? { title: 'محرر المظهر', presets: 'المظاهر الجاهزة', colors: 'الألوان', background: 'الخلفية', card: 'البطاقات', text: 'النص', accent: 'التمييز', image: 'رابط صورة الخلفية', video: 'رابط فيديو الخلفية', overlay: 'تعتيم الخلفية', css: 'CSS مخصص', save: 'حفظ المظهر', reset: 'إعادة ضبط' }
    : { title: 'Theme editor', presets: 'Built-in themes', colors: 'Colors', background: 'Background', card: 'Cards', text: 'Text', accent: 'Accent', image: 'Background image URL', video: 'Background video URL', overlay: 'Background overlay', css: 'Custom CSS', save: 'Save theme', reset: 'Reset' };

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold">{labels.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{isRtl ? 'تغييراتك تظهر فوراً في المعاينة.' : 'Changes update the preview instantly.'}</p>
        </div>
        <div className="flex gap-2">
          {onReset && <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-3.5 w-3.5" />{labels.reset}</Button>}
          {onSave && <Button size="sm" onClick={onSave}><Save className="h-3.5 w-3.5" />{labels.save}</Button>}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-600">{labels.presets}</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {themePresets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => onChange({ ...preset })} className={`rounded-xl border p-2 text-start transition hover:-translate-y-0.5 ${theme.id === preset.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
              <span className="mb-2 flex h-8 items-center gap-1 rounded-lg p-1" style={{ backgroundColor: preset.background }}>
                <i className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.accent }} />
                <i className="h-3 flex-1 rounded" style={{ backgroundColor: preset.card }} />
              </span>
              <span className="flex items-center justify-between truncate text-[11px] font-bold text-slate-700">
                {preset.id.replace('-', ' ')} {theme.id === preset.id && <Check className="h-3.5 w-3.5 text-indigo-600" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-600">{labels.colors}</h4>
        <div className="grid grid-cols-2 gap-3">
          {([['background', labels.background], ['card', labels.card], ['text', labels.text], ['accent', labels.accent]] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold">
              <input type="color" value={theme[key]} onChange={(event) => setColor(key, event.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={label} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <label className="block text-xs font-bold text-slate-700">{labels.image}<input value={theme.backgroundImage ?? ''} onChange={(event) => set({ backgroundImage: event.target.value || undefined })} placeholder="https://…" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" /></label>
        <label className="block text-xs font-bold text-slate-700">{labels.video}<input value={theme.backgroundVideo ?? ''} onChange={(event) => set({ backgroundVideo: event.target.value || undefined })} placeholder="https://…" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" /></label>
        <label className="block text-xs font-bold text-slate-700">{labels.overlay}<input type="range" min="0" max="0.8" step="0.05" value={theme.overlay?.opacity ?? 0} onChange={(event) => set({ overlay: { ...(theme.overlay ?? { blur: 0 }), opacity: Number(event.target.value) } })} className="mt-2 w-full accent-indigo-600" /></label>
        <label className="block text-xs font-bold text-slate-700">{labels.css}<textarea value={theme.customCss ?? ''} onChange={(event) => set({ customCss: event.target.value.slice(0, 4000) })} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" placeholder=".profile-card { … }" />{customCssWarning && <span role="alert" className="mt-1.5 block text-xs font-semibold text-rose-600">{customCssWarning}</span>}</label>
      </div>
    </section>
  );
};
