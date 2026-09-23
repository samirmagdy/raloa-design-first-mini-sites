import type { LegacyProfileBlock, ProfileBlock, BlockConfig, BlockConfigValue } from './block';
import type { RepositoryFieldError } from './result';
import type { BlockFieldDefinition, BlockTextSlot } from './blockRegistry';
import { getBlockDefinition } from './blockRegistry';
import { localize, uid } from './common';

const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|#|\/)/i;

export const safeBlockUrl = (value: string | undefined): string => {
  const trimmed = (value ?? '').trim();
  return trimmed && SAFE_URL_PATTERN.test(trimmed) ? trimmed : '#';
};

export const isSafeUrl = (value: string | undefined): boolean =>
  Boolean(value && SAFE_URL_PATTERN.test(value.trim()));

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const hostOf = (value: string): string | null => {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

export const isEmbedUrlAllowed = (url: string, hosts: string[] = []): boolean => {
  const host = hostOf(url);
  if (!host) return false;
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

/** Only inline formatting survives; the server runs the same rule before storing `content`. */
export const sanitizeRichText = (value: string): string =>
  value
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)[^>]*>[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(\/?)(a|img|br|p|div|span|strong|b|em|i|u|s|ul|ol|li|h[1-6]|blockquote|code|pre)\b[^>]*>/gi, (match) =>
      /on\w+\s*=|javascript:|data:text\/html/i.test(match) ? '' : match
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|data):[^"']*["']/gi, '$1="#"');

export const visibleFields = (
  fields: BlockFieldDefinition[],
  config: BlockConfig
): BlockFieldDefinition[] =>
  fields.filter((field) => !field.when || config[field.when.key] === field.when.equals);

const configValueMatchesKind = (field: BlockFieldDefinition, value: BlockConfigValue | undefined): string | null => {
  if (value === undefined || value === '') return field.required ? 'required' : null;
  if (field.kind === 'number' || field.kind === 'currency') {
    if (typeof value !== 'number' && !/^-?\d+(\.\d+)?$/.test(String(value))) return 'number';
    const numeric = Number(value);
    if (field.min !== undefined && numeric < field.min) return 'min';
    if (field.max !== undefined && numeric > field.max) return 'max';
    return null;
  }
  if (field.kind === 'image-list' || field.kind === 'options') {
    return Array.isArray(value) ? null : 'list';
  }
  if (field.kind === 'toggle') return typeof value === 'boolean' ? null : 'boolean';
  if (field.kind === 'url' || field.kind === 'embed' || field.kind === 'image' || field.kind === 'video' || field.kind === 'audio') {
    if (typeof value !== 'string' || value.trim() === '') return 'required';
    if (!isSafeUrl(value)) return 'url';
    if (field.kind === 'embed' && !isEmbedUrlAllowed(value, field.embedHosts ?? [])) return 'host';
    return null;
  }
  if (field.kind === 'email') return isEmail(String(value)) ? null : 'email';
  if (field.kind === 'select' && field.options) {
    return field.options.some((option) => option.value === value) ? null : 'option';
  }
  if (typeof value === 'string' && field.maxLength && value.length > field.maxLength) return 'maxLength';
  return null;
};

const VALIDATION_MESSAGES: Record<string, { en: (label: string) => string; ar: (label: string) => string }> = {
  required: { en: (label) => `${label} is required.`, ar: (label) => `${label} مطلوب.` },
  number: { en: (label) => `${label} must be a number.`, ar: (label) => `يجب أن يكون ${label} رقماً.` },
  list: {
    en: (label) => `${label} must be a list of values.`,
    ar: (label) => `يجب أن يكون ${label} قائمة قيم.`
  },
  boolean: {
    en: (label) => `${label} must be a yes/no value.`,
    ar: (label) => `يجب أن يكون ${label} نعم أو لا.`
  },
  url: {
    en: (label) => `${label} must start with https://, mailto: or tel:.`,
    ar: (label) => `يجب أن يبدأ ${label} بـ https:// أو mailto: أو tel:.`
  },
  host: {
    en: (label) => `${label} is not a supported embed URL.`,
    ar: (label) => `${label} ليس رابط تضمين مدعوماً.`
  },
  email: {
    en: (label) => `${label} must be a valid email address.`,
    ar: (label) => `يجب أن يكون ${label} بريداً إلكترونياً صحيحاً.`
  },
  option: {
    en: (label) => `${label} is not one of the allowed values.`,
    ar: (label) => `${label} ليست من القيم المسموحة.`
  }
};

const fieldMessage = (field: BlockFieldDefinition, reason: string, numeric?: string): RepositoryFieldError => {
  const labelEn = localize(field.label, 'en');
  const labelAr = localize(field.label, 'ar') || labelEn;
  if (reason === 'min' || reason === 'max' || reason === 'maxLength') {
    const bound = numeric ?? '';
    return {
      field: field.key,
      message: {
        en: `${labelEn} must be ${reason === 'maxLength' ? 'at most' : 'at least'} ${bound}.`,
        ar: `يجب أن يكون ${labelAr} ${reason === 'maxLength' ? 'أقل' : 'على الأقل'} من ${bound}.`
      }
    };
  }
  const template = VALIDATION_MESSAGES[reason] ?? VALIDATION_MESSAGES.required;
  return { field: field.key, message: { en: template.en(labelEn), ar: template.ar(labelAr) } };
};

/** Client half of the config validation the server repeats (D3). */
/**
 * `requireContent: false` is the draft rule: a block may be stored half-finished while you type, so
 * only values that are present and wrong are rejected. Publishing uses the default rule.
 */
export interface BlockValidationOptions {
  requireContent?: boolean;
}

export const validateBlock = (block: ProfileBlock, options: BlockValidationOptions = {}): RepositoryFieldError[] => {
  const requireContent = options.requireContent !== false;
  const definition = getBlockDefinition(block.type);
  if (!definition) return [{ field: 'type', message: { en: 'Unknown block type.', ar: 'نوع كتلة غير معروف.' } }];

  const errors: RepositoryFieldError[] = [];
  const requiredSlot = (slot: BlockTextSlot) => {
    const value = localize(block[slot] ?? '', 'en') || localize(block[slot] ?? '', 'ar');
    if (!value.trim()) {
      errors.push({ field: slot, message: { en: 'This text is required.', ar: 'هذا النص مطلوب.' } });
    }
  };

  if (definition.titleRequired && requireContent) requiredSlot('title');
  if (definition.hasUrl && definition.urlRequired) {
    const url = (block.url ?? '').trim();
    if (url ? !isSafeUrl(url) : requireContent) {
      errors.push({
        field: 'url',
        message: { en: 'Add a link starting with https://, mailto: or tel:.', ar: 'أضف رابطاً يبدأ بـ https:// أو mailto: أو tel:.' }
      });
    }
  }
  if (block.type === 'phone' && block.url && !/^tel:/i.test(block.url)) {
    errors.push({
      field: 'url',
      message: { en: 'Phone numbers use the tel: format, for example tel:+201000000000.', ar: 'أرقام الهاتف تستخدم صيغة tel: مثل tel:+201000000000.' }
    });
  }
  if (block.type === 'email' && block.url && !isEmail(block.url.replace(/^mailto:/i, ''))) {
    errors.push({ field: 'url', message: { en: 'Enter a valid email address.', ar: 'أدخل بريداً إلكترونياً صحيحاً.' } });
  }

  visibleFields(definition.fields, block.config).forEach((field) => {
    const reason = configValueMatchesKind(field, block.config[field.key]);
    if (!reason) return;
    if (!requireContent && reason === 'required') return;
    const bound = reason === 'max' ? field.max : reason === 'maxLength' ? field.maxLength : field.min;
    errors.push(fieldMessage(field, reason, String(bound ?? '')));
  });

  return errors;
};

const DEFAULT_CONFIG: Partial<Record<string, BlockConfigValue>> = {
  fit: 'cover',
  columns: 2,
  height: 24,
  rating: 5,
  currency: 'USD',
  expanded: false,
  autoplay: false,
  mediaCount: 6,
  captionLinks: true,
  gateMode: 'local'
};

export const defaultConfigFor = (type: ProfileBlock['type']): BlockConfig => {
  const definition = getBlockDefinition(type);
  if (!definition) return {};
  return definition.fields.reduce<BlockConfig>((config, field) => {
    const fallback = DEFAULT_CONFIG[field.key];
    if (fallback !== undefined) config[field.key] = fallback;
    if (field.kind === 'image-list') config[field.key] = [];
    return config;
  }, {});
};

const TITLES: Partial<Record<ProfileBlock['type'], string>> = {
  link: 'New link',
  section: 'New section',
  folder: 'Folder',
  image: 'Image',
  gallery: 'Image gallery',
  carousel: 'Photo carousel',
  audio: 'Audio player',
  mp3: 'Track',
  video: 'Video',
  'direct-video': 'Clip',
  faq: 'A common question',
  testimonial: 'What a client said',
  product: 'New product',
  event: 'Upcoming event',
  newsletter: 'Join the newsletter',
  'contact-form': 'Get in touch',
  'password-gate': 'Protected content'
};

export const createBlock = (
  type: ProfileBlock['type'],
  pageId: string,
  position: number,
  parentId: string | null = null
): ProfileBlock => {
  const definition = getBlockDefinition(type);
  const label = definition ? localize(definition.label, 'en') : 'Block';
  const title = TITLES[type] ?? label;
  const block: ProfileBlock = {
    id: uid('block'),
    pageId,
    parentId,
    type,
    title: definition?.textSlots.includes('title') ? title : undefined,
    subtitle: definition?.textSlots.includes('subtitle')
      ? { en: 'Add a short description', ar: 'أضف وصفاً قصيراً' }
      : undefined,
    content: definition?.textSlots.includes('content')
      ? { en: 'Add your content here.', ar: 'أضف محتواك هنا.' }
      : undefined,
    url: definition?.hasUrl ? 'https://example.com' : type === 'phone' ? 'tel:+201000000000' : type === 'email' ? 'you@example.com' : undefined,
    config: defaultConfigFor(type),
    position,
    visible: true,
    version: 1
  };
  if (type === 'folder' || type === 'password-gate') block.children = [];
  return block;
};

/** D2 migration: the old union encoded state as type, which cannot compose with other states. */
export const normalizeLegacyBlock = (
  legacy: LegacyProfileBlock,
  pageId: string,
  position: number,
  parentId: string | null = null
): ProfileBlock => {
  const legacyType = legacy.type as string;
  const type = (
    legacyType === 'hidden' || legacyType === 'scheduled' || legacyType === 'highlighted' || legacyType === 'badge' || legacyType === 'icon'
      ? 'link'
      : legacyType
  ) as ProfileBlock['type'];

  const config: BlockConfig = { ...legacy.data };
  const block: ProfileBlock = {
    id: legacy.id || uid('block'),
    pageId,
    parentId,
    type,
    title: legacy.title,
    subtitle: legacy.subtitle,
    content: legacy.content,
    url: legacy.url,
    config,
    position,
    visible: legacyType === 'hidden' ? false : legacy.visible !== false,
    version: 1
  };

  if (legacyType === 'scheduled') {
    block.schedule = {
      startsAt: typeof config.startsAt === 'string' ? config.startsAt : undefined,
      endsAt: typeof config.endsAt === 'string' ? config.endsAt : undefined
    };
    delete config.startsAt;
    delete config.endsAt;
  }
  if (legacyType === 'highlighted') block.emphasis = 'highlight';
  if (legacyType === 'badge') block.badge = { label: legacy.title };
  if (legacyType === 'icon') block.badge = { label: legacy.title, icon: typeof config.icon === 'string' ? config.icon : 'Link2' };

  if (legacy.children?.length) {
    block.children = legacy.children.map((child, index) => normalizeLegacyBlock(child, pageId, index, block.id));
  }
  return block;
};

/** Wire format: one flat array with `parentId`, ordered by position. */
export const flattenBlocks = (blocks: ProfileBlock[]): ProfileBlock[] =>
  blocks.flatMap((block) => {
    const children = block.children ?? [];
    const { children: _stripped, ...rest } = block;
    return [rest, ...flattenBlocks(children)];
  });

export const nestBlocks = (blocks: ProfileBlock[]): ProfileBlock[] => {
  const byParent = new Map<string | null, ProfileBlock[]>();
  blocks.forEach((block) => {
    const key = block.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push({ ...block, children: undefined });
    byParent.set(key, list);
  });
  const build = (parentKey: string | null): ProfileBlock[] =>
    (byParent.get(parentKey) ?? [])
      .sort((left, right) => left.position - right.position)
      .map((block) => {
        const children = build(block.id);
        return children.length ? { ...block, children } : { ...block, children: undefined };
      });
  return build(null);
};
