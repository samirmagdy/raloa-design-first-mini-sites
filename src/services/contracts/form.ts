import type { Id, IsoDateTime, LocalizedText, Timestamped, Versioned } from './common';

export type FormFieldKind = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'consent';

export interface FormFieldDefinition {
  id: Id;
  kind: FormFieldKind;
  /** Stable key used in the submission payload; derived from the label, editable. */
  name: string;
  label: LocalizedText;
  placeholder?: LocalizedText;
  helpText?: LocalizedText;
  required: boolean;
  options?: string[];
  /** Consent fields also require an explicit opt-in before submit. */
  defaultValue?: string | boolean;
}

export interface FormDefinition extends Versioned, Timestamped {
  id: Id;
  profileId: Id;
  pageId?: Id;
  /** The `contact-form` block this schema belongs to, so editor and renderer stay identical. */
  blockId?: Id;
  title: LocalizedText;
  description?: LocalizedText;
  submitLabel: LocalizedText;
  successMessage: LocalizedText;
  fields: FormFieldDefinition[];
  enabled: boolean;
}

export type FormSubmissionValue = string | boolean | string[];

export interface FormSubmission {
  id: Id;
  formId: Id;
  profileId: Id;
  values: Record<string, FormSubmissionValue>;
  submittedAt: IsoDateTime;
  read: boolean;
  pageUrl?: string;
  userAgent?: string;
}
