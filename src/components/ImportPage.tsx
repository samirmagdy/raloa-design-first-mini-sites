import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, FileJson, Link2, Loader2, Upload } from 'lucide-react';
import type { Locale } from '../types';
import { navigate } from '../app/router';
import { useRepository } from '../services/RepositoryContext';
import type { ImportCommitResult, ImportJob, ImportPreview } from '../services';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';
import { EmptyState } from './ui/States';
import { useToast } from './ui/Toast';
import { ui, text, tx, fill } from '../i18n/ui';
import { useAsyncResource } from '../services/useAsyncResource';

interface ImportPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

type Mode = 'linktree' | 'json';

const MAX_JSON_BYTES = 1024 * 1024;

export const ImportPage: React.FC<ImportPageProps> = ({ locale, onReturnHome }) => {
  const repository = useRepository();
  const toast = useToast();
  const isRtl = locale === 'ar';
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('linktree');
  const [input, setInput] = useState('');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const profiles = useAsyncResource(() => repository.profiles.list(), []);
  const [targetProfileId, setTargetProfileId] = useState('');
  const target = targetProfileId || profiles.data?.[0]?.id || '';

  useEffect(() => {
    if (!job || job.status === 'ready' || job.status === 'committed') return;
    const timer = window.setTimeout(async () => {
      const next = await repository.imports.status(job.id);
      if (next.ok) setJob(next.data);
      else setError(text(next.error.message, locale));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [job, repository, locale]);

  useEffect(() => {
    if (job?.preview) setSelected(job.preview.items.filter((item) => item.selected).map((item) => item.id));
  }, [job?.preview]);

  const start = async (payload: string) => {
    setError(null);
    setResult(null);
    setJob(null);
    setBusy(true);
    const started = await repository.imports.start(mode === 'json' ? 'raloa-json' : 'linktree', payload);
    setBusy(false);
    if (!started.ok) {
      setError(text(started.error.message, locale));
      return;
    }
    setJob(started.data);
  };

  const commit = async () => {
    if (!job || !target) return;
    setBusy(true);
    setError(null);
    const committed = await repository.imports.commit(job.id, target, selected);
    setBusy(false);
    if (!committed.ok) {
      setError(text(committed.error.message, locale));
      return;
    }
    setResult(committed.data);
    toast({ title: tx(ui.import.result, locale), message: tx(ui.import.resultBody, locale), tone: 'success' });
  };

  const preview: ImportPreview | undefined = job?.preview;
  const progress = job?.progress ?? 0;

  const [duplicateIds, setDuplicateIds] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!preview || !target) { setDuplicateIds({}); return; }
    let active = true;
    void repository.pages.list(target, { withBlocks: true }).then((result) => {
      if (!active || !result.ok) return;
      const existing = new Map(result.data.flatMap((page) => page.blocks).map((block) => [block.url, block.id]));
      setDuplicateIds(Object.fromEntries(preview.items.filter((item) => item.url && existing.has(item.url)).map((item) => [item.id, existing.get(item.url)!])));
    });
    return () => { active = false; };
  }, [preview, target, repository]);
  const items = useMemo(() => (preview?.items ?? []).map((item) => duplicateIds[item.id] ? { ...item, duplicateOf: duplicateIds[item.id] } : item), [preview, duplicateIds]);
  const duplicateCount = items.filter((item) => item.duplicateOf).length;

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-surface-alt px-4 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex min-h-11 items-center gap-2 text-sm font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink">
              <RaloaMark size={25} theme="on-dark" />
            </span>
            RALOA
          </a>
          <Button variant="secondary" size="sm" onClick={() => navigate('/studio/overview')}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {tx(ui.studio.title, locale)}
          </Button>
        </header>

        <div className="mt-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{tx(ui.import.heading, locale)}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{tx(ui.import.heading, locale)}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{tx(ui.import.help, locale)}</p>
        </div>

        <Surface className="mt-8 p-5 sm:p-7">
          <div className="flex gap-1 overflow-x-auto rounded-pill border border-slate-200 bg-surface-alt p-1" role="tablist" aria-label={tx(ui.import.help, locale)}>
            {(['linktree', 'json'] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => {
                  setMode(item);
                  setJob(null);
                  setResult(null);
                  setError(null);
                }}
                className={`min-h-10 flex-1 rounded-pill px-3 text-xs font-bold ${mode === item ? 'bg-white text-ink shadow-sm' : 'text-slate-600'}`}
              >
                {item === 'linktree' ? tx(ui.import.sourceLinktree, locale) : tx(ui.import.sourceJson, locale)}
              </button>
            ))}
          </div>

          {mode === 'linktree' ? (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void start(input);
              }}
            >
              <Input
                label={tx(ui.import.sourceLinktree, locale)}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={tx(ui.import.pasteUrl, locale)}
                dir="ltr"
              />
              <Button type="submit" className="w-full" disabled={!input.trim() || busy} loading={busy}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {tx(ui.import.validate, locale)}
              </Button>
            </form>
          ) : (
            <div className="mt-5">
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_JSON_BYTES) {
                    setError(isRtl ? 'الملف أكبر من ١ ميجابايت.' : 'That file is larger than 1 MB.');
                    return;
                  }
                  void start(await file.text());
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex min-h-40 w-full flex-col items-center justify-center rounded-panel border-2 border-dashed border-slate-300 bg-surface-alt px-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <Upload className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                <span className="mt-3 text-sm font-extrabold">{isRtl ? 'اختر ملف JSON' : 'Choose a JSON file'}</span>
                <span className="mt-1 text-xs text-slate-500">{isRtl ? 'الحد الأقصى ١ ميجابايت' : 'Maximum size: 1 MB'}</span>
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-control bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                {error}{' '}
                <button type="button" onClick={() => void start(input)} className="underline underline-offset-2">
                  {tx(ui.common.retry, locale)}
                </button>
              </span>
            </p>
          )}

          {job && !preview && (
            <div className="mt-6" aria-live="polite">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden="true" />
                  {job.status}
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-pill bg-indigo-600 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-2xs text-slate-500">{tx(ui.import.stages, locale)}</p>
            </div>
          )}

          {preview && !result && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold">{tx(ui.import.preview, locale)}</h2>
                  <p className="mt-0.5 text-xs text-slate-500" dir="ltr">
                    {preview.sourceUrl}
                  </p>
                </div>
                <Select
                  label={tx(ui.import.pickProfile, locale)}
                  value={target}
                  onChange={(event) => setTargetProfileId(event.target.value)}
                  options={(profiles.data ?? []).map((item) => ({ value: item.id, label: `@${item.username}` }))}
                  className="sm:w-52"
                />
              </div>

              {duplicateCount > 0 && (
                <p className="flex items-start gap-2 rounded-control bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {tx(ui.import.duplicateWarning, locale)} ({duplicateCount})
                </p>
              )}

              <ul className="divide-y divide-slate-100 overflow-hidden rounded-control border border-slate-200">
                {items.map((item) => {
                  const checked = selected.includes(item.id);
                  return (
                    <li key={item.id} className={`flex min-h-14 items-center gap-3 px-3 py-2 ${checked ? 'bg-white' : 'bg-surface-alt'}`}>
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSelected((current) => (event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)))
                          }
                          className="h-4 w-4 shrink-0 accent-indigo-600"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-800">{text(item.title, locale)}</span>
                          <span className="block truncate text-2xs text-slate-500" dir="ltr">
                            {item.kind === 'page' ? 'page' : item.url}
                          </span>
                        </span>
                      </label>
                      {item.duplicateOf && <span className="shrink-0 rounded-pill bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">{isRtl ? 'مكرر' : 'duplicate'}</span>}
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500">{fill(tx(ui.import.selected, locale), { count: selected.length })}</p>
                <Button onClick={() => void commit()} disabled={!selected.length || busy} loading={busy}>
                  <FileJson className="h-4 w-4" aria-hidden="true" />
                  {tx(ui.import.commit, locale)}
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-panel border border-emerald-200 bg-emerald-50 p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-extrabold text-emerald-900">{tx(ui.import.result, locale)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                {fill(tx(ui.import.resultBody, locale), {
                  pages: result.createdPages,
                  blocks: result.createdBlocks,
                  skipped: result.skippedDuplicates
                })}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => navigate('/studio/editor')}>
                  {tx(ui.studio.editor, locale)}
                </Button>
                <Button onClick={() => navigate('/studio/preview')}>{tx(ui.studio.preview, locale)}</Button>
              </div>
            </div>
          )}
        </Surface>

        {!job && !error && (
          <div className="mt-6">
            <EmptyState
              icon={Upload}
              title={tx(ui.import.validate, locale)}
              body={tx(ui.common.demoNote, locale)}
              note={isRtl ? 'لا تُرسل أي بيانات إلى خدمة خارجية.' : 'Nothing is sent to an external service.'}
            />
          </div>
        )}
      </div>
    </main>
  );
};
