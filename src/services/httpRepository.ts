import type { AuthMode, Credentials, Session } from './contracts/auth';
import type { AnalyticsEvent, AnalyticsRequest, AnalyticsSnapshot } from './contracts/analytics';
import type { ProfileBlock } from './contracts/block';
import type { CustomDomain } from './contracts/domain';
import type { FormDefinition, FormSubmission, FormSubmissionValue } from './contracts/form';
import type { ImportCommitResult, ImportJob, ImportPreview } from './contracts/importJob';
import type { Integration, IntegrationKind } from './contracts/integration';
import type { MediaAsset, MediaUploadRequest } from './contracts/media';
import type { PageDraft, ProfilePage } from './contracts/page';
import type { PublicProfile, ProfileSocial, ProfileSummary, ProfileUsage, UsernameAvailability } from './contracts/profile';
import type { RaloaRepository } from './repository';
import type { PageRequest, Paginated, RepositoryError, Result } from './contracts/result';
import type { Subscriber, SubscribeIntent, SubscribeResult } from './contracts/subscriber';
import type { ApiKey, CreatedApiKey } from './contracts/apiKey';
import type { Template, TemplateApplyResult } from './contracts/template';
import type { ThemeConfig } from './contracts/theme';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
type Json = Record<string, unknown>;

const errorResult = <T,>(error: RepositoryError): Result<T> => ({ ok: false, error });
const asObject = (value: unknown): Json => value && typeof value === 'object' ? value as Json : {};
const lower = (value: unknown) => typeof value === 'string' ? value.toLowerCase() : value;
const normalizeError = (value: unknown, status: number): RepositoryError => {
  const source = asObject(value);
  const error = asObject(source.error ?? source);
  const code = typeof error.code === 'string' ? error.code : status === 401 ? 'unauthorized' : status === 404 ? 'not_found' : 'server';
  return { code: code as RepositoryError['code'], message: typeof error.message === 'string' ? error.message : 'Request failed.', retryable: status >= 500 || status === 429, detail: JSON.stringify(value) };
};

const request = async <T,>(path: string, init: RequestInit = {}): Promise<Result<T>> => {
  try {
    const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...init.headers } });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return errorResult(normalizeError(body, response.status));
    return { ok: true, data: body.data as T };
  } catch (error) {
    return errorResult({ code: 'network', message: error instanceof Error ? error.message : 'Network request failed.', retryable: true });
  }
};

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });
const del = (): RequestInit => ({ method: 'DELETE' });

const normalizeBlock = (value: unknown): ProfileBlock => {
  const block = asObject(value);
  return { ...block, id: String(block.id), pageId: String(block.pageId), parentId: (block.parentId as string | null) ?? null, type: block.type as ProfileBlock['type'], config: asObject(block.config) as ProfileBlock['config'], visible: block.visible !== false, position: Number(block.position ?? 0), version: Number(block.version ?? 1), createdAt: String(block.createdAt ?? ''), updatedAt: String(block.updatedAt ?? '') } as ProfileBlock;
};

const normalizePage = (value: unknown): ProfilePage => {
  const page = asObject(value);
  return { ...page, id: String(page.id), profileId: String(page.profileId), title: page.title as ProfilePage['title'], slug: String(page.slug), description: page.description as ProfilePage['description'], published: Boolean(page.published), visibility: lower(page.visibility) as ProfilePage['visibility'], position: Number(page.position ?? 0), version: Number(page.version ?? 1), blocks: Array.isArray(page.blocks) ? page.blocks.map(normalizeBlock) : [], createdAt: String(page.createdAt ?? ''), updatedAt: String(page.updatedAt ?? '') } as ProfilePage;
};

const normalizeProfile = (value: unknown): PublicProfile => {
  const profile = asObject(value);
  return { ...profile, ownerId: String(profile.ownerId ?? profile.ownerUserId), avatarUrl: String(profile.avatarUrl ?? ''), socials: Array.isArray(profile.socials) ? profile.socials as ProfileSocial[] : [], version: Number(profile.version ?? 1), createdAt: String(profile.createdAt ?? ''), updatedAt: String(profile.updatedAt ?? '') } as PublicProfile;
};

const normalizeSession = (value: unknown): Session | null => {
  if (!value || typeof value !== 'object') return null;
  const source = asObject(value);
  const userSource = asObject(source.user ?? source);
  const now = new Date();
  return {
    user: {
      id: String(userSource.id ?? ''),
      email: String(userSource.email ?? ''),
      displayName: String(userSource.displayName ?? userSource.email ?? ''),
      plan: (userSource.plan ?? 'free') as Session['user']['plan'],
      createdAt: String(userSource.createdAt ?? now.toISOString())
    },
    signedInAt: String(source.signedInAt ?? now.toISOString()),
    expiresAt: String(source.expiresAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
  };
};

const normalizePageResult = <T,>(result: Result<T[]>): Result<ProfilePage[]> => result.ok ? { ok: true, data: result.data.map(normalizePage) } : result;

const profiles: RaloaRepository['profiles'] = {
  list: async () => { const result = await request<unknown[]>('/api/v1/profiles'); return result.ok ? { ok: true as const, data: result.data.map((item) => asObject(item) as unknown as ProfileSummary) } : result; },
  get: async (id: string) => { const result = await request<unknown | null>(`/api/v1/profiles/${id}`); return result.ok ? { ok: true, data: result.data ? normalizeProfile(result.data) : null } : result; },
  getByUsername: async (username: string) => { const result = await request<unknown | null>(`/public/v1/profiles/${encodeURIComponent(username)}`); return result.ok ? { ok: true, data: result.data ? normalizeProfile(result.data) : null } : result; },
  usage: async () => request<ProfileUsage>('/api/v1/profiles/usage'),
  activeId: async () => { const result = await profiles.list(); return result.ok ? { ok: true, data: result.data[0]?.id ?? null } : result; },
  setActive: async (id: string) => { const result = await profiles.get(id); return result.ok && result.data ? { ok: true, data: id } : result as Result<string>; },
  checkUsername: async (username: string): Promise<Result<UsernameAvailability>> => { const result = await profiles.list(); if (!result.ok) return result; return { ok: true, data: (result.data.some((item) => item.username === username.toLowerCase()) ? 'taken' : 'available') as UsernameAvailability }; },
  create: async (input: { username: string; displayName: string; role?: unknown; bio?: unknown }) => { const result = await request<unknown>('/api/v1/profiles', json(input)); return result.ok ? { ok: true, data: normalizeProfile(result.data) } : result; },
  update: async (id: string, input: Record<string, unknown>, expectedVersion: number) => { const result = await request<unknown>(`/api/v1/profiles/${id}`, patch({ ...input, expectedVersion })); return result.ok ? { ok: true, data: normalizeProfile(result.data) } : result; },
  duplicate: async (id: string) => { const result = await request<unknown>(`/api/v1/profiles/${id}/duplicate`, json({})); return result.ok ? { ok: true, data: normalizeProfile(result.data) } : result; },
  remove: async (id: string) => request<void>(`/api/v1/profiles/${id}`, del()),
  setPublished: async (id: string, published: boolean) => { const current = await profiles.get(id); if (!current.ok || !current.data) return current as Result<PublicProfile>; return profiles.update(id, { published }, current.data.version); },
  listSocials: async (id: string) => { const result = await profiles.get(id); return result.ok && result.data ? { ok: true, data: result.data.socials } : result as Result<ProfileSocial[]>; },
  saveSocial: async (id: string, social: ProfileSocial) => { const current = await profiles.get(id); if (!current.ok || !current.data) return current as Result<ProfileSocial[]>; return profiles.update(id, { socials: [...current.data.socials.filter((item) => item.id !== social.id), social] }, current.data.version).then((result) => result.ok ? { ok: true, data: result.data.socials } : result); },
  removeSocial: async (id: string, socialId: string) => { const current = await profiles.get(id); if (!current.ok || !current.data) return current as Result<ProfileSocial[]>; return profiles.update(id, { socials: current.data.socials.filter((item) => item.id !== socialId) }, current.data.version).then((result) => result.ok ? { ok: true, data: result.data.socials } : result); }
};

const pages: RaloaRepository['pages'] = {
  list: async (profileId: string) => normalizePageResult(await request<unknown[]>(`/api/v1/profiles/${profileId}/pages`)),
  get: async (pageId: string) => { const result = await request<unknown>(`/api/v1/pages/${pageId}`); return result.ok ? { ok: true, data: normalizePage(result.data) } : result as Result<ProfilePage | null>; },
  create: async (profileId: string, draft: PageDraft) => { const result = await request<unknown>(`/api/v1/profiles/${profileId}/pages`, json(draft)); return result.ok ? { ok: true, data: normalizePage(result.data) } : result; },
  update: async (pageId: string, draft: Partial<PageDraft>, expectedVersion: number) => { const result = await request<unknown>(`/api/v1/pages/${pageId}`, patch({ ...draft, expectedVersion })); return result.ok ? { ok: true, data: normalizePage(result.data) } : result; },
  duplicate: async (pageId: string) => { const result = await request<unknown>(`/api/v1/pages/${pageId}/duplicate`, json({})); return result.ok ? { ok: true, data: normalizePage(result.data) } : result; },
  remove: async (pageId: string) => request<void>(`/api/v1/pages/${pageId}`, del()),
  reorder: async (profileId: string, orderedPageIds: string[]) => normalizePageResult(await request<unknown[]>(`/api/v1/profiles/${profileId}/pages/order`, put({ orderedPageIds }))),
  setPublished: async (pageId: string, published: boolean) => { const current = await pages.get(pageId); if (!current.ok) return current; if (!current.data) return errorResult<ProfilePage>({ code: 'not_found', message: 'Page not found.' }); return pages.update(pageId, { visibility: published ? 'public' : 'draft' }, current.data.version); }
};

const blocks: RaloaRepository['blocks'] = {
  list: async (pageId: string) => { const result = await request<unknown[]>(`/api/v1/pages/${pageId}/blocks`); return result.ok ? { ok: true, data: result.data.map(normalizeBlock) } : result; },
  create: async (pageId: string, block: Omit<ProfileBlock, 'id' | 'pageId' | 'version'>) => { const result = await request<unknown>(`/api/v1/pages/${pageId}/blocks`, json(block)); return result.ok ? { ok: true, data: normalizeBlock(result.data) } : result; },
  update: async (pageId: string, blockId: string, input: Partial<ProfileBlock>, expectedVersion: number) => { const result = await request<unknown>(`/api/v1/pages/${pageId}/blocks/${blockId}`, patch({ ...input, expectedVersion })); return result.ok ? { ok: true, data: normalizeBlock(result.data) } : result; },
  remove: async (pageId: string, blockId: string) => request<void>(`/api/v1/pages/${pageId}/blocks/${blockId}`, del()),
  duplicate: async (pageId: string, blockId: string) => { const result = await request<unknown>(`/api/v1/pages/${pageId}/blocks/${blockId}/duplicate`, json({})); return result.ok ? { ok: true, data: normalizeBlock(result.data) } : result; },
  reorder: async (pageId: string, orderedBlockIds: string[], parentId?: string | null) => { const result = await request<unknown[]>(`/api/v1/pages/${pageId}/blocks/order`, put({ orderedBlockIds, parentId })); return result.ok ? { ok: true, data: result.data.map(normalizeBlock) } : result; },
  setVisible: async (pageId: string, blockId: string, visible: boolean) => { const current = await blocks.list(pageId); const item = current.ok ? current.data.find((block) => block.id === blockId) : undefined; if (!item) return errorResult({ code: 'not_found', message: 'Block not found.' }); const result = await request<unknown>(`/api/v1/pages/${pageId}/blocks/${blockId}/visibility`, patch({ visible, expectedVersion: item.version })); return result.ok ? { ok: true, data: normalizeBlock(result.data) } : result; }
};

const themes: RaloaRepository['themes'] = {
  get: async (profileId: string) => request<ThemeConfig>(`/api/v1/profiles/${profileId}/theme`),
  save: async (profileId: string, theme: ThemeConfig, expectedVersion: number) => request<ThemeConfig>(`/api/v1/profiles/${profileId}/theme`, put({ theme, expectedVersion })),
  reset: async (profileId: string) => { const profile = await profiles.get(profileId); if (!profile.ok || !profile.data) return profile as Result<ThemeConfig>; return themes.save(profileId, profile.data.theme, profile.data.version); }
};

const media: RaloaRepository['media'] = {
  list: async (profileId?: string) => { const result = await request<unknown[]>(`/api/v1/profiles/${profileId ?? ''}/media`); return result.ok ? { ok: true, data: result.data as MediaAsset[] } : result; },
  requestUpload: async (input: MediaUploadRequest) => { const result = await request<{ asset: MediaAsset; uploadUrl: string; expiresIn: number }>(`/api/v1/profiles/${input.profileId}/media/presign`, json(input)); return result.ok ? { ok: true, data: { ...result.data, expiresAt: new Date(Date.now() + result.data.expiresIn * 1000).toISOString() } } : result; },
  upload: async (file: File, profileId?: string) => { if (!profileId) return errorResult<MediaAsset>({ code: 'validation', message: 'A profile is required for media upload.' }); const input: MediaUploadRequest = { profileId, filename: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file' }; const upload = await media.requestUpload(input); if (!upload.ok) return upload as Result<MediaAsset>; const uploaded = await fetch(upload.data.uploadUrl, { method: 'PUT', body: file, headers: { 'content-type': input.mimeType } }); if (!uploaded.ok) return errorResult<MediaAsset>({ code: 'network', message: 'Media upload failed.', retryable: true }); return request<MediaAsset>(`/api/v1/profiles/${profileId}/media/${upload.data.asset.id}/complete`, { method: 'POST' }); },
  remove: async (assetId: string) => { const profileList = await profiles.list(); if (!profileList.ok) return profileList as Result<void>; for (const profile of profileList.data) { const assets = await media.list(profile.id); if (assets.ok && assets.data.some((asset) => asset.id === assetId)) return request<void>(`/api/v1/profiles/${profile.id}/media/${assetId}`, del()); } return errorResult<void>({ code: 'not_found', message: 'Media asset not found.' }); }
};

const analytics: RaloaRepository['analytics'] = {
  snapshot: async (input: AnalyticsRequest) => { const result = await request<AnalyticsSnapshot>(`/api/v1/profiles/${input.profileId}/analytics?days=${input.range.replace('d', '')}`); return result; },
  record: async (event: Omit<AnalyticsEvent, 'id' | 'occurredAt'>) => request<void>(`/public/v1/profiles/${event.profileId}/events`, json({ ...event, type: event.type.toUpperCase(), visitorHash: event.visitorKey }))
};

const forms: RaloaRepository['forms'] = {
  list: async (profileId: string) => request<FormDefinition[]>(`/api/v1/profiles/${profileId}/forms`),
  get: async (formId: string) => request<FormDefinition | null>(`/api/v1/forms/${formId}`),
  save: async (form: FormDefinition, expectedVersion = form.version) => { const path = form.id ? `/api/v1/profiles/${form.profileId}/forms/${form.id}` : `/api/v1/profiles/${form.profileId}/forms`; const result = await request<FormDefinition>(path, form.id ? patch({ ...form, expectedVersion }) : json(form)); return result; },
  remove: async (formId: string) => request<void>(`/api/v1/forms/${formId}`, del())
};

const submissions: RaloaRepository['submissions'] = {
  list: async (profileId: string, _request?: PageRequest): Promise<Result<Paginated<FormSubmission>>> => { const result = await request<FormSubmission[]>(`/api/v1/profiles/${profileId}/submissions`); return result.ok ? { ok: true, data: { items: result.data, nextCursor: null, total: result.data.length } } : result; },
  get: async (submissionId: string) => request<FormSubmission | null>(`/api/v1/submissions/${submissionId}`),
  submit: async (formId: string, values: Record<string, FormSubmissionValue>) => request<FormSubmission>(`/public/v1/forms/${formId}/submissions`, json(values)),
  markRead: async (submissionId: string, read: boolean) => request<FormSubmission>(`/api/v1/submissions/${submissionId}`, patch({ read })),
  remove: async (submissionId: string) => request<void>(`/api/v1/submissions/${submissionId}`, del()),
  exportCsv: async (profileId: string) => { const response = await fetch(`${API_BASE}/api/v1/profiles/${profileId}/submissions/export.csv`, { credentials: 'include' }); return response.ok ? { ok: true, data: { filename: 'raloa-submissions.csv', contents: await response.text() } } : errorResult({ code: 'server', message: 'Could not export submissions.' }); }
};

const subscribers: RaloaRepository['subscribers'] = {
  list: async (profileId: string, _request?: PageRequest): Promise<Result<Paginated<Subscriber>>> => { const result = await request<Subscriber[]>(`/api/v1/profiles/${profileId}/subscribers`); return result.ok ? { ok: true, data: { items: result.data, nextCursor: null, total: result.data.length } } : result; },
  subscribe: async (input: SubscribeIntent) => request<SubscribeResult>(`/public/v1/profiles/${input.profileId}/subscribers`, json(input)),
  confirm: async (token: string) => request<Subscriber>('/public/v1/subscribers/confirm', json({ token })),
  unsubscribe: async (token: string) => request<Subscriber>('/public/v1/subscribers/unsubscribe', json({ token })),
  remove: async (subscriberId: string) => request<void>(`/api/v1/subscribers/${subscriberId}`, del()),
  exportCsv: async (profileId: string) => { const response = await fetch(`${API_BASE}/api/v1/profiles/${profileId}/subscribers/export.csv`, { credentials: 'include' }); return response.ok ? { ok: true, data: { filename: 'raloa-subscribers.csv', contents: await response.text() } } : errorResult<{ filename: string; contents: string }>({ code: 'server', message: 'Could not export subscribers.' }); }
};

const findDomainContext = async (domainId: string) => {
  const profileList = await profiles.list();
  if (!profileList.ok) return profileList;
  for (const profile of profileList.data) { const result = await domains.list(profile.id); if (result.ok && result.data.some((domain) => domain.id === domainId)) return { ok: true as const, data: { profileId: profile.id } }; }
  return errorResult<{ profileId: string }>({ code: 'not_found', message: 'Domain not found.' });
};

const domains: RaloaRepository['domains'] = {
  list: async (profileId: string) => { const result = await request<CustomDomain[]>(`/api/v1/profiles/${profileId}/domains`); return result.ok ? { ok: true, data: result.data.map((domain) => ({ ...domain, status: lower(domain.status), ssl: lower(domain.ssl) })) as CustomDomain[] } : result; },
  add: async (profileId: string, hostname: string) => request<CustomDomain>(`/api/v1/profiles/${profileId}/domains`, json({ hostname })),
  verify: async (domainId: string) => { const context = await findDomainContext(domainId); return context.ok ? request<CustomDomain>(`/api/v1/profiles/${context.data.profileId}/domains/${domainId}/verify`, json({})) : context; },
  setPrimary: async (domainId: string) => { const context = await findDomainContext(domainId); return context.ok ? request<CustomDomain[]>(`/api/v1/profiles/${context.data.profileId}/domains/${domainId}/primary`, patch({})) : context; },
  remove: async (domainId: string) => { const context = await findDomainContext(domainId); return context.ok ? request<void>(`/api/v1/profiles/${context.data.profileId}/domains/${domainId}`, del()) : context; }
};

const integrations: RaloaRepository['integrations'] = {
  list: async (profileId: string) => request<Integration[]>(`/api/v1/profiles/${profileId}/integrations`),
  connect: async (profileId: string, kind: IntegrationKind, handle: string) => request<Integration>(`/api/v1/profiles/${profileId}/integrations/${kind}/connect`, json({ handle })),
  disconnect: async (profileId: string, kind: IntegrationKind) => request<Integration>(`/api/v1/profiles/${profileId}/integrations/${kind}/disconnect`, json({})),
  sync: async (profileId: string, kind: IntegrationKind) => request<Integration>(`/api/v1/profiles/${profileId}/integrations/${kind}/sync`, json({})),
  setTrackingId: async (profileId: string, kind: IntegrationKind, trackingId: string, enabled: boolean) => request<Integration>(`/api/v1/profiles/${profileId}/integrations/${kind}/tracking`, patch({ trackingId, enabled }))
};

const apiKeys: RaloaRepository['apiKeys'] = {
  list: async (profileId: string) => request<ApiKey[]>(`/api/v1/profiles/${profileId}/api-keys`),
  create: async (profileId: string, input: { name: string; scopes: ApiKey['scopes']; expiresAt?: string | null }) => request<CreatedApiKey>(`/api/v1/profiles/${profileId}/api-keys`, json(input)),
  revoke: async (profileId: string, keyId: string) => request<ApiKey>(`/api/v1/profiles/${profileId}/api-keys/${keyId}`, del())
};

const templates: RaloaRepository['templates'] = {
  list: async () => request<Template[]>('/api/v1/templates'),
  get: async (templateId: string) => request<Template | null>(`/api/v1/templates/${templateId}`),
  apply: async (profileId: string, templateId: string, options?: { keepSocials?: boolean }) => request<TemplateApplyResult>(`/api/v1/templates/${templateId}/apply`, json({ profileId, ...options }))
};

const imports: RaloaRepository['imports'] = {
  start: async (source: ImportJob['source'], input: string) => request<ImportJob>('/api/v1/imports', json({ source, input })),
  status: async (jobId: string) => request<ImportJob>(`/api/v1/imports/${jobId}`),
  preview: async (jobId: string) => { const result = await request<ImportJob>(`/api/v1/imports/${jobId}`); return result.ok && result.data.preview ? { ok: true, data: result.data.preview } : errorResult({ code: 'not_found', message: 'Import preview not found.' }); },
  commit: async (jobId: string, profileId: string, selectedItemIds: string[]) => request<ImportCommitResult>(`/api/v1/imports/${jobId}/commit`, json({ profileId, selectedItemIds }))
};

const auth: RaloaRepository['auth'] = {
  session: async () => { const result = await request<unknown>('/api/v1/auth/me'); return result.ok ? { ok: true, data: normalizeSession(result.data) } : result; },
  signIn: async (credentials: Credentials, mode: AuthMode = 'signin') => { const result = await request<unknown>(`/api/v1/auth/${mode === 'signup' ? 'register' : 'login'}`, json(credentials)); return result.ok ? { ok: true, data: normalizeSession(result.data) as Session } : result; },
  signOut: async () => request<void>('/api/v1/auth/logout', json({}))
};

export const createHttpRepository = (): RaloaRepository => ({ profiles, pages, blocks, themes, media, analytics, forms, submissions, subscribers, domains, integrations, apiKeys, templates, imports, auth });
