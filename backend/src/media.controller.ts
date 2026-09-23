import { Body, Controller, Delete, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { idSchema, parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';

@Controller('api/v1/profiles/:profileId/media')
@UseGuards(SessionGuard)
export class MediaController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Get()
  async list(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string) { if (!(await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: request.user!.id } }))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; return { ok: true, data: await this.prisma.mediaAsset.findMany({ where: { profileId }, orderBy: { createdAt: 'desc' } }) }; }
  @Post('presign')
  async presign(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { if (!(await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: request.user!.id } }))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const input = parseBody(z.object({ filename: z.string().min(1).max(200), mimeType: z.string().min(1), sizeBytes: z.number().int().positive() }), body); const signed = await this.storage.presign(profileId, input.filename, input.mimeType, input.sizeBytes); const asset = await this.prisma.mediaAsset.create({ data: { profileId, objectKey: signed.objectKey, filename: input.filename, mimeType: input.mimeType, sizeBytes: input.sizeBytes } }); return { ok: true, data: { asset, uploadUrl: signed.uploadUrl, expiresIn: 600 } }; }
  @Post(':assetId/complete')
  async complete(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('assetId') assetId: string) { const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, profileId, profile: { ownerUserId: request.user!.id } } }); if (!asset) return { ok: false, error: { code: 'not_found', message: 'Media asset not found.' } }; const result = await this.storage.complete(asset.objectKey, asset.sizeBytes, asset.mimeType); const updated = await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: 'READY' } }); return { ok: true, data: { ...updated, publicUrl: result.publicUrl } }; }
  @Delete(':assetId')
  async remove(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('assetId') assetId: string) { const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, profileId, profile: { ownerUserId: request.user!.id } } }); if (!asset) return { ok: false, error: { code: 'not_found', message: 'Media asset not found.' } }; await this.storage.remove(asset.objectKey); await this.prisma.mediaAsset.delete({ where: { id: asset.id } }); return { ok: true, data: null }; }
}
