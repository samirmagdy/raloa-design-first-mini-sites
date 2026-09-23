import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { z } from 'zod';
import { idSchema, parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';

const MAX_IMPORT_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const itemSchema = z.object({
  title: z.union([z.string(), z.record(z.string(), z.string())]),
  subtitle: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  url: z.string().url().optional(),
  type: z.string().optional()
});

const normalize = (value: unknown) => {
  const input = z.object({
    title: z.union([z.string(), z.record(z.string(), z.string())]),
    blocks: z.array(itemSchema).optional()
  }).parse(value);
  return { title: input.title, blocks: input.blocks ?? [] };
};

const isPrivateAddress = (address: string) => {
  const normalized = address.toLowerCase();
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized)) return true;
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mappedIpv4 ?? normalized;
  if (isIP(ipv4) !== 4) return false;
  const [first, second] = ipv4.split('.').map(Number);
  return first === 0 || first === 10 || first === 127 || first >= 224 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
};

const assertSafeImportUrl = async (value: string) => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Only public HTTPS import URLs are allowed.');
  const hostname = url.hostname.replace(/[\[\]]/g, '').toLowerCase();
  if (['localhost', 'metadata', 'metadata.google.internal'].includes(hostname)) throw new Error('Private import hosts are not allowed.');
  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true })).map(({ address }) => address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error('Private import hosts are not allowed.');
  return url;
};

const readLimitedResponse = async (response: Response) => {
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_IMPORT_BYTES) throw new Error('Import source is too large.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMPORT_BYTES) throw new Error('Import source is too large.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

const fetchPublicImport = async (input: string) => {
  let url = await assertSafeImportUrl(input);
  let response: Response | undefined;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json,text/html' } });
    if (!redirectStatuses.has(response.status)) break;
    const location = response.headers.get('location');
    if (!location || redirect === MAX_REDIRECTS) throw new Error('Import source redirected too many times.');
    url = await assertSafeImportUrl(new URL(location, url).toString());
  }
  if (!response?.ok) throw new Error('Import source returned an error.');
  return { url, text: await readLimitedResponse(response) };
};

@Controller('api/v1/imports')
@UseGuards(SessionGuard)
export class ImportController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Post()
  async start(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseBody(z.object({ source: z.enum(['linktree', 'urlswerv', 'raloa-json']), input: z.string().min(1).max(1_000_000) }), body);
    const job = await this.prisma.importJob.create({ data: { userId: req.user!.id, source: input.source.toUpperCase().replace('-', '_') as any, input: input.input, status: 'PARSING', progress: 25 } });
    try {
      const raw = input.source === 'raloa-json' ? JSON.parse(input.input) : await this.parseExternalInput(input.input);
      const normalized = normalize(raw);
      const preview = {
        jobId: job.id,
        source: input.source,
        handle: input.input,
        sourceUrl: input.input,
        items: normalized.blocks.map((block, index) => ({ id: `${job.id}-${index}`, kind: 'block', type: block.type ?? 'link', title: typeof block.title === 'string' ? { en: block.title } : block.title, subtitle: typeof block.subtitle === 'string' ? { en: block.subtitle } : block.subtitle, url: block.url, selected: true })),
        warnings: []
      };
      const saved = await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'READY', progress: 100, preview: { ...preview, page: normalized.title } } });
      return { ok: true, data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: message } });
      return { ok: false, error: { code: 'validation', message } };
    }
  }

  @Get(':jobId')
  async status(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, userId: req.user!.id } });
    return job ? { ok: true, data: job } : { ok: false, error: { code: 'not_found', message: 'Import job not found.' } };
  }

  @Post(':jobId/commit')
  async commit(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string, @Body() body: unknown) {
    const input = parseBody(z.object({ profileId: idSchema, selectedItemIds: z.array(z.string()).optional() }), body);
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, userId: req.user!.id, status: 'READY' } });
    const profile = await this.prisma.profile.findFirst({ where: { id: input.profileId, ownerUserId: req.user!.id } });
    if (!job || !profile) return { ok: false, error: { code: 'not_found', message: 'Import job or profile not found.' } };
    const preview = job.preview as { page?: unknown; items: Array<{ id: string; type?: string; title: unknown; subtitle?: unknown; url?: string }> };
    const selectedIds = new Set(input.selectedItemIds ?? preview.items.map((item) => item.id));
    const blocks = preview.items.filter((item) => selectedIds.has(item.id));
    const page = await this.prisma.page.create({ data: { profileId: profile.id, title: preview.page ?? { en: 'Imported links' }, slug: `import-${Date.now().toString(36)}`, description: { en: 'Imported from an external profile.' }, visibility: 'DRAFT', blocks: { create: blocks.map((item, index) => ({ type: item.type ?? 'link', title: item.title as any, subtitle: item.subtitle as any, url: item.url, config: {}, position: index })) } }, include: { blocks: true } });
    await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'COMMITTED', committedAt: new Date() } });
    return { ok: true, data: { jobId, createdPages: 1, createdBlocks: page.blocks.length, skippedDuplicates: 0 } };
  }

  private async parseExternalInput(input: string) {
    const { url, text } = await fetchPublicImport(input);
    return text.trim().startsWith('{') ? JSON.parse(text) : { title: url.hostname, blocks: [...text.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].slice(0, 100).map((match) => ({ title: match[1], url: match[1], type: 'link' })) };
  }
}
