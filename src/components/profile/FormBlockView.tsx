import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import type { Locale } from '../../types';
import type { ProfileBlock } from '../../services/contracts/block';
import type { ThemeConfig } from '../../services/contracts/theme';
import type { FormDefinition, FormFieldDefinition } from '../../services/contracts/form';
import type { RepositoryError } from '../../services/contracts/result';
import type { LocalizedText } from '../../services/contracts/common';
import { useRepository } from '../../services/RepositoryContext';
import { text } from '../../i18n/ui';

interface FormBlockViewProps {
  block: ProfileBlock;
  locale: Locale;
  theme: ThemeConfig;
  kind: 'newsletter' | 'contact-form';
  /** Studio passes the draft schema so the editor and the public page render one tree. */
  draftForm?: FormDefinition | null;
}

type Phase = 'idle' | 'sending' | 'sent' | 'failed';

export const FormBlockView: React.FC<FormBlockViewProps> = ({ block, locale, theme, kind, draftForm }) => {
  const repository = useRepository();
  const [remoteForm, setRemoteForm] = useState<FormDefinition | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<RepositoryError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formId = typeof block.config.formId === 'string' ? block.config.formId : '';

  useEffect(() => {
    if (kind !== 'contact-form' || !formId || draftForm) return;
    let active = true;
    void repository.forms.get(formId).then((result) => {
      if (active && result.ok && result.data) setRemoteForm(result.data);
    });
    return () => {
      active = false;
    };
  }, [formId, kind, draftForm, repository]);

  const form = draftForm ?? remoteForm;
  const isRtl = locale === 'ar';
  const accent = theme.accent;
  const title = text(block.title, locale, kind === 'newsletter' ? (isRtl ? 'اشترك في النشرة' : 'Join the newsletter') : isRtl ? 'تواصل معي' : 'Get in touch');
  const subtitle = text(block.subtitle, locale);

  const fields = useMemo<FormFieldDefinition[]>(() => {
    if (kind === 'newsletter') {
      return [
        { id: 'nl-email', kind: 'email', name: 'email', label: { en: 'Email address', ar: 'البريد الإلكتروني' }, required: true }
      ];
    }
    return form?.fields ?? [];
  }, [kind, form?.fields]);

  const inputClass = 'min-h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const missing: Record<string, string> = {};
    fields.forEach((field) => {
      const value = values[field.name];
      if (field.required && (value === undefined || value === '' || value === false)) {
        missing[field.name] = isRtl ? 'هذا الحقل مطلوب.' : 'This field is required.';
      }
      if (field.kind === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value))) {
        missing[field.name] = isRtl ? 'أدخل بريداً صحيحاً.' : 'Enter a valid email address.';
      }
    });
    setFieldErrors(missing);
    if (Object.keys(missing).length) return;

    setPhase('sending');
    const result =
      kind === 'newsletter'
        ? await repository.subscribers.subscribe({
            profileId: block.pageId.split('-page-')[0],
            email: String(values.email ?? ''),
            blockId: block.id
          }).then((response) => (response.ok ? { ok: true as const } : response))
        : form
          ? await repository.submissions.submit(form.id, values).then((response) => (response.ok ? { ok: true as const } : response))
          : { ok: false, error: { code: 'validation' as const, message: { en: 'This form is not set up yet.', ar: 'لم يتم تجهيز هذا النموذج بعد.' } } };

    if ('ok' in result && result.ok) {
      setPhase('sent');
      setValues({});
      return;
    }
    setError('error' in result ? result.error : null);
    setPhase('failed');
  };

  if (phase === 'sent') {
    const raw = form?.successMessage ?? block.config.successMessage;
    const successMessage = typeof raw === 'string' ? raw : raw && typeof raw === 'object' && !Array.isArray(raw) ? text(raw, locale) : '';
    return (
      <div className="flex items-start gap-3 rounded-card border border-emerald-200 bg-emerald-50 p-5 text-start" style={{ borderRadius: 'var(--profile-card-radius)' }}>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-sm font-bold leading-relaxed text-emerald-900" role="status">
          {successMessage || text({ en: 'Thanks — that came through.', ar: 'شكراً، وصل طلبك.' }, locale)}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-card p-5 text-start"
      style={{
        backgroundColor: theme.card,
        color: theme.text,
        borderRadius: 'var(--profile-card-radius)',
        border: 'var(--profile-card-border) solid rgba(148,163,184,0.3)',
        boxShadow: 'var(--profile-card-shadow)'
      }}
    >
      <h3 className="text-base font-extrabold" style={{ color: theme.text }}>{title}</h3>
      {subtitle && <p className="mt-1 text-sm" style={{ color: theme.mutedText }}>{subtitle}</p>}

      <div className="mt-4 space-y-3">
        {kind === 'contact-form' && !fields.length && (
          <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
            {isRtl ? 'لم تُضف حقول لهذا النموذج بعد. افتح منشئ النماذج في الإعدادات.' : 'This form has no fields yet. Open the form builder in Settings.'}
          </p>
        )}
        {fields.map((field) => {
          const invalid = fieldErrors[field.name];
          const id = `${block.id}-${field.name}`;
          if (field.kind === 'consent' || field.kind === 'checkbox') {
            return (
              <label key={field.id} className="flex min-h-11 items-start gap-2 text-xs font-semibold" style={{ color: theme.text }}>
                <input
                  type="checkbox"
                  id={id}
                  checked={Boolean(values[field.name])}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                  aria-invalid={Boolean(invalid)}
                />
                <span>
                  {text(field.label, locale)}
                  {invalid && <span className="mt-0.5 block text-rose-600">{invalid}</span>}
                </span>
              </label>
            );
          }
          return (
            <label key={field.id} className="block text-start" htmlFor={id}>
              <span className="mb-1.5 block text-xs font-bold" style={{ color: theme.mutedText }}>
                {text(field.label, locale)}
                {field.required && <span className="text-rose-500"> *</span>}
              </span>
              {field.kind === 'textarea' ? (
                <textarea
                  id={id}
                  rows={3}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  placeholder={text(field.placeholder ?? '', locale) || undefined}
                  className={`${inputClass} resize-y`}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                />
              ) : field.kind === 'select' ? (
                <select
                  id={id}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  className={inputClass}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                >
                  <option value="">{text(field.placeholder ?? { en: 'Choose one', ar: 'اختر واحداً' }, locale)}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : 'text'}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  placeholder={text(field.placeholder ?? '', locale) || undefined}
                  className={inputClass}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                />
              )}
              {fieldErrors[field.name] && <span className="mt-1 block text-xs font-semibold text-rose-600">{fieldErrors[field.name]}</span>}
            </label>
          );
        })}

        <button
          type="submit"
          disabled={phase === 'sending'}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {phase === 'sending'
            ? isRtl ? 'جارٍ الإرسال…' : 'Sending…'
            : form
              ? text(form.submitLabel, locale)
              : isRtl
                ? kind === 'newsletter' ? 'اشترك' : 'إرسال'
                : kind === 'newsletter' ? 'Subscribe' : 'Send message'}
        </button>

        {error && (
          <p role="alert" className="rounded-control bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {text(error.message, locale)}
            {error.retryable ? (isRtl ? ' — جرّب مرة أخرى.' : ' — you can try again.') : ''}
          </p>
        )}
        <p className="text-2xs" style={{ color: theme.mutedText }}>
          {isRtl ? 'وضع تجريبي — يُحفظ محلياً حتى ربط الخادم.' : 'Demo mode — stored on this device until the API is connected.'}
        </p>
      </div>
    </form>
  );
};
