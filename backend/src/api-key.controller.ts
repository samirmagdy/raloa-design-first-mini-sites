import { Body, Controller, Delete, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { hashToken, parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';

const scopes = z.enum(['profiles:read', 'profiles:write', 'analytics:read', 'subscribers:read']);

@Controller('api/v1/profiles/:profileId/api-keys')
@UseGuards(SessionGuard)
export class ApiKeyController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { const profile = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: req.user!.id } }); if (!profile) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; return { ok: true, data: await this.prisma.apiKey.findMany({ where: { profileId }, select: { id: true, profileId: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' } }) }; }
  @Post()
  async create(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { const profile = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: req.user!.id } }); if (!profile) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const input = parseBody(z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(scopes).min(1), expiresAt: z.coerce.date().nullable().optional() }), body); const secret = `raloa_live_${randomBytes(24).toString('base64url')}`; const saved = await this.prisma.apiKey.create({ data: { profileId, name: input.name, prefix: secret.slice(0, 18), tokenHash: hashToken(secret), scopes: input.scopes as any, expiresAt: input.expiresAt ?? null } }); const { tokenHash: _tokenHash, ...safe } = saved; return { ok: true, data: { ...safe, token: secret } }; }
  @Delete(':keyId')
  async revoke(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('keyId') keyId: string) { const updated = await this.prisma.apiKey.updateMany({ where: { id: keyId, profileId, profile: { ownerUserId: req.user!.id } }, data: { revokedAt: new Date() } }); return updated.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'API key not found.' } }; }
}
