import type { Id, IsoDateTime } from './common';

export type DomainStatus = 'pending' | 'verifying' | 'verified' | 'failed';

export type SslStatus = 'none' | 'provisioning' | 'active' | 'error';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  /** What the creator must do with it, rendered next to the copy button. */
  instruction?: string;
}

export interface CustomDomain {
  id: Id;
  profileId: Id;
  hostname: string;
  status: DomainStatus;
  ssl: SslStatus;
  /** TXT record the verification step reads back; mock-generated. */
  verificationToken: string;
  records: DnsRecord[];
  isPrimary: boolean;
  lastCheckedAt?: IsoDateTime;
  /** Present when the provider rejected the zone, e.g. missing CAA record. */
  detail?: string;
  createdAt: IsoDateTime;
}
