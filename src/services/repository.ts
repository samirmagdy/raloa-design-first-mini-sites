import type { ApiKey, CreatedApiKey } from './contracts/apiKey';
import type { AnalyticsEvent, AnalyticsRequest, AnalyticsSnapshot } from './contracts/analytics';
import type { Credentials, AuthMode, Session } from './contracts/auth';
import type { ProfileBlock } from './contracts/block';
import type { CustomDomain } from './contracts/domain';
import type { FormDefinition, FormSubmission, FormSubmissionValue } from './contracts/form';
import type { ImportCommitResult, ImportJob, ImportPreview } from './contracts/importJob';
import type { Integration, IntegrationKind } from './contracts/integration';
import type { MediaAsset, MediaUploadRequest } from './contracts/media';
import type { PageDraft, ProfilePage } from './contracts/page';
import type { PublicProfile, ProfileSocial, ProfileSummary, ProfileUsage, UsernameAvailability } from './contracts/profile';
import type { PageRequest, Paginated, RepositoryError, Result } from './contracts/result';
import type { Subscriber, SubscribeIntent, SubscribeResult } from './contracts/subscriber';
import type { Template, TemplateApplyResult } from './contracts/template';
import type { ThemeConfig } from './contracts/theme';
import type { Id, IsoDateTime, LocalizedText } from './contracts/common';

/**
 * The seam. `mockRepository` implements this over localStorage; `httpRepository` will implement it
 * over `/api/v1` with the same envelopes. Nothing in `src/components` may import an implementation
 * directly — see the `repository-only` rule in scripts/architecture-check.mjs.
 *
 * Every read returns `Result<T, RepositoryError>` (D5) and every write is per aggregate with an
 * `expectedVersion` (D4), so autosave, conflict detection and optimistic UI are expressible today.
 */

export interface ProfilesRepository {
  list(): Promise<Result<ProfileSummary[]>>;
  get(profileId: Id): Promise<Result<PublicProfile | null>>;
  getByUsername(username: string): Promise<Result<PublicProfile | null>>;
  usage(): Promise<Result<ProfileUsage>>;
  /** The profile the account is working on. Screens read this instead of guessing `list()[0]`. */
  activeId(): Promise<Result<Id | null>>;
  setActive(profileId: Id): Promise<Result<Id>>;
  checkUsername(username: string): Promise<Result<UsernameAvailability>>;
  create(input: { username: string; displayName: string; role?: LocalizedText; bio?: LocalizedText }): Promise<Result<PublicProfile>>;
  update(
    profileId: Id,
    patch: Partial<Omit<PublicProfile, 'id' | 'ownerId' | 'version'>>,
    expectedVersion: number
  ): Promise<Result<PublicProfile>>;
  duplicate(profileId: Id): Promise<Result<PublicProfile>>;
  remove(profileId: Id): Promise<Result<void>>;
  setPublished(profileId: Id, published: boolean): Promise<Result<PublicProfile>>;
  listSocials(profileId: Id): Promise<Result<ProfileSocial[]>>;
  saveSocial(profileId: Id, social: ProfileSocial): Promise<Result<ProfileSocial[]>>;
  removeSocial(profileId: Id, socialId: Id): Promise<Result<ProfileSocial[]>>;
}

export interface PagesRepository {
  list(profileId: Id, options?: { withBlocks?: boolean }): Promise<Result<ProfilePage[]>>;
  get(pageId: Id): Promise<Result<ProfilePage | null>>;
  create(profileId: Id, draft: PageDraft): Promise<Result<ProfilePage>>;
  update(pageId: Id, patch: Partial<PageDraft>, expectedVersion: number): Promise<Result<ProfilePage>>;
  duplicate(pageId: Id): Promise<Result<ProfilePage>>;
  remove(pageId: Id): Promise<Result<void>>;
  reorder(profileId: Id, orderedPageIds: Id[]): Promise<Result<ProfilePage[]>>;
  setPublished(pageId: Id, published: boolean): Promise<Result<ProfilePage>>;
}

export interface BlocksRepository {
  list(pageId: Id): Promise<Result<ProfileBlock[]>>;
  create(pageId: Id, block: Omit<ProfileBlock, 'id' | 'pageId' | 'version'>): Promise<Result<ProfileBlock>>;
  update(pageId: Id, blockId: Id, patch: Partial<Omit<ProfileBlock, 'id' | 'pageId'>>, expectedVersion: number): Promise<Result<ProfileBlock>>;
  remove(pageId: Id, blockId: Id): Promise<Result<void>>;
  duplicate(pageId: Id, blockId: Id): Promise<Result<ProfileBlock>>;
  reorder(pageId: Id, orderedBlockIds: Id[], parentId?: Id | null): Promise<Result<ProfileBlock[]>>;
  setVisible(pageId: Id, blockId: Id, visible: boolean): Promise<Result<ProfileBlock>>;
}

export interface ThemesRepository {
  get(profileId: Id): Promise<Result<ThemeConfig>>;
  save(profileId: Id, theme: ThemeConfig, expectedVersion: number): Promise<Result<ThemeConfig>>;
  reset(profileId: Id): Promise<Result<ThemeConfig>>;
}

export interface MediaRepository {
  list(profileId?: Id): Promise<Result<MediaAsset[]>>;
  requestUpload(input: MediaUploadRequest): Promise<Result<{ asset: MediaAsset; uploadUrl: string; expiresAt: IsoDateTime }>>;
  /** Mock reads a data URL; the backend copies the committed object out of the upload bucket. */
  upload(file: File, profileId?: Id): Promise<Result<MediaAsset>>;
  remove(assetId: Id): Promise<Result<void>>;
}

export interface AnalyticsRepository {
  snapshot(request: AnalyticsRequest): Promise<Result<AnalyticsSnapshot>>;
  record(event: Omit<AnalyticsEvent, 'id' | 'occurredAt'>): Promise<Result<void>>;
}

export interface FormsRepository {
  list(profileId: Id): Promise<Result<FormDefinition[]>>;
  get(formId: Id): Promise<Result<FormDefinition | null>>;
  save(form: FormDefinition, expectedVersion?: number): Promise<Result<FormDefinition>>;
  remove(formId: Id): Promise<Result<void>>;
}

export interface SubmissionsRepository {
  list(profileId: Id, request?: PageRequest): Promise<Result<Paginated<FormSubmission>>>;
  get(submissionId: Id): Promise<Result<FormSubmission | null>>;
  /** Public write path used by a rendered form block. */
  submit(formId: Id, values: Record<string, FormSubmissionValue>): Promise<Result<FormSubmission>>;
  markRead(submissionId: Id, read: boolean): Promise<Result<FormSubmission>>;
  remove(submissionId: Id): Promise<Result<void>>;
  exportCsv(profileId: Id): Promise<Result<{ filename: string; contents: string }>>;
}

export interface SubscribersRepository {
  list(profileId: Id, request?: PageRequest): Promise<Result<Paginated<Subscriber>>>;
  subscribe(intent: SubscribeIntent): Promise<Result<SubscribeResult>>;
  confirm(token: string): Promise<Result<Subscriber>>;
  unsubscribe(token: string): Promise<Result<Subscriber>>;
  remove(subscriberId: Id): Promise<Result<void>>;
  exportCsv(profileId: Id): Promise<Result<{ filename: string; contents: string }>>;
}

export interface DomainsRepository {
  list(profileId: Id): Promise<Result<CustomDomain[]>>;
  add(profileId: Id, hostname: string): Promise<Result<CustomDomain>>;
  verify(domainId: Id): Promise<Result<CustomDomain>>;
  setPrimary(domainId: Id): Promise<Result<CustomDomain[]>>;
  remove(domainId: Id): Promise<Result<void>>;
}

export interface IntegrationsRepository {
  list(profileId: Id): Promise<Result<Integration[]>>;
  connect(profileId: Id, kind: IntegrationKind, handle: string): Promise<Result<Integration>>;
  disconnect(profileId: Id, kind: IntegrationKind): Promise<Result<Integration>>;
  sync(profileId: Id, kind: IntegrationKind): Promise<Result<Integration>>;
  setTrackingId(profileId: Id, kind: IntegrationKind, trackingId: string, enabled: boolean): Promise<Result<Integration>>;
}

export interface ApiKeysRepository {
  list(profileId: Id): Promise<Result<ApiKey[]>>;
  create(profileId: Id, input: { name: string; scopes: ApiKey['scopes']; expiresAt?: IsoDateTime | null }): Promise<Result<CreatedApiKey>>;
  revoke(profileId: Id, keyId: Id): Promise<Result<ApiKey>>;
}

export interface TemplatesRepository {
  list(): Promise<Result<Template[]>>;
  get(templateId: Id): Promise<Result<Template | null>>;
  apply(profileId: Id, templateId: Id, options?: { keepSocials?: boolean }): Promise<Result<TemplateApplyResult>>;
}

export interface ImportsRepository {
  start(source: ImportJob['source'], input: string): Promise<Result<ImportJob>>;
  status(jobId: Id): Promise<Result<ImportJob>>;
  preview(jobId: Id): Promise<Result<ImportPreview>>;
  commit(jobId: Id, profileId: Id, selectedItemIds: Id[]): Promise<Result<ImportCommitResult>>;
}

export interface AuthRepository {
  session(): Promise<Result<Session | null>>;
  signIn(credentials: Credentials, mode?: AuthMode): Promise<Result<Session>>;
  signOut(): Promise<Result<void>>;
}

export interface RaloaRepository {
  readonly profiles: ProfilesRepository;
  readonly pages: PagesRepository;
  readonly blocks: BlocksRepository;
  readonly themes: ThemesRepository;
  readonly media: MediaRepository;
  readonly analytics: AnalyticsRepository;
  readonly forms: FormsRepository;
  readonly submissions: SubmissionsRepository;
  readonly subscribers: SubscribersRepository;
  readonly domains: DomainsRepository;
  readonly integrations: IntegrationsRepository;
  readonly apiKeys: ApiKeysRepository;
  readonly templates: TemplatesRepository;
  readonly imports: ImportsRepository;
  readonly auth: AuthRepository;
}
