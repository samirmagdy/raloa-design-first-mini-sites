import type { Id, IsoDateTime } from './common';

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export interface MediaAsset {
  id: Id;
  ownerId: Id;
  profileId?: Id;
  kind: MediaKind;
  filename: string;
  /** Public URL once the asset is committed; a CDN URL in the real backend. */
  url: string;
  /** Object key the backend owns; the mock uses a namespaced local key. */
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  alt?: string;
  createdAt: IsoDateTime;
}

/** Presigned-upload contract (M3): the client never streams bytes through the API process. */
export interface MediaUploadIntent {
  assetId: Id;
  storageKey: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  expiresAt: IsoDateTime;
  headers: Record<string, string>;
}

export interface MediaUploadRequest {
  profileId?: Id;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
}
