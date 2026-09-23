import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { idSchema, localized, parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';

const pageInput = z.object({ title: localized, slug: z.string().regex(/^[a-z0-9-]+$/), description: localized, visibility: z.enum(['PUBLIC', 'DRAFT', 'UNLISTED']).optional(), published: z.boolean().optional() });
const blockPatch = z.object({ type: z.string().min(1).max(64).optional(), title: localized.nullable().optional(), subtitle: localized.nullable().optional(), content: localized.nullable().optional(), url: z.string().url().nullable().optional(), config: z.record(z.string(), z.unknown()).optional(), visible: z.boolean().optional(), expectedVersion: z.number().int().positive() });
const hasProfile = async (prisma: PrismaService, userId: string, profileId: string) => prisma.profile.findFirst({ where: { id: profileId, ownerUserId: userId }, select: { id: true } });

@Controller('api/v1/profiles/:profileId/pages')
@UseGuards(SessionGuard)
export class PageController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { const owner = await hasProfile(this.prisma, req.user!.id, parseBody(idSchema, profileId)); if (!owner) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const pages = await this.prisma.page.findMany({ where: { profileId }, orderBy: { position: 'asc' }, include: { blocks: { orderBy: { position: 'asc' } } } }); return { ok: true, data: pages }; }
  @Post()
  async create(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { const id = parseBody(idSchema, profileId); if (!(await hasProfile(this.prisma, req.user!.id, id))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const input = parseBody(pageInput, body); const page = await this.prisma.page.create({ data: { profileId: id, title: input.title, slug: input.slug, description: input.description, visibility: input.visibility ?? 'DRAFT', published: input.published ?? false, position: await this.prisma.page.count({ where: { profileId: id } }) } }); return { ok: true, data: page }; }
  @Patch(':pageId')
  async update(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('pageId') pageId: string, @Body() body: unknown) { const input = parseBody(pageInput.partial().extend({ expectedVersion: z.number().int().positive() }), body); const page = await this.prisma.page.findFirst({ where: { id: pageId, profileId, profile: { ownerUserId: req.user!.id } } }); if (!page) return { ok: false, error: { code: 'not_found', message: 'Page not found.' } }; if (page.version !== input.expectedVersion) return { ok: false, error: { code: 'conflict', message: 'Page changed since it was opened.', currentVersion: page.version } }; const { expectedVersion: _, ...patch } = input; return { ok: true, data: await this.prisma.page.update({ where: { id: pageId }, data: { ...patch, version: { increment: 1 } } }) }; }
}

@Controller('api/v1/pages/:pageId/blocks')
@UseGuards(SessionGuard)
export class BlockController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string) { const page = await this.prisma.page.findFirst({ where: { id: pageId, profile: { ownerUserId: req.user!.id } } }); if (!page) return { ok: false, error: { code: 'not_found', message: 'Page not found.' } }; return { ok: true, data: await this.prisma.block.findMany({ where: { pageId }, orderBy: { position: 'asc' } }) }; }
  @Patch(':blockId')
  async update(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string, @Param('blockId') blockId: string, @Body() body: unknown) { const input = parseBody(blockPatch, body); const block = await this.prisma.block.findFirst({ where: { id: blockId, pageId, page: { profile: { ownerUserId: req.user!.id } } } }); if (!block) return { ok: false, error: { code: 'not_found', message: 'Block not found.' } }; if (block.version !== input.expectedVersion) return { ok: false, error: { code: 'conflict', message: 'Block changed since it was opened.', currentVersion: block.version } }; const { expectedVersion: _, ...patch } = input; return { ok: true, data: await this.prisma.block.update({ where: { id: blockId }, data: { ...(patch as any), version: { increment: 1 } } }) }; }
  @Put('order')
  async reorder(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string, @Body() body: unknown) { const input = parseBody(z.object({ orderedBlockIds: z.array(idSchema) }), body); const page = await this.prisma.page.findFirst({ where: { id: pageId, profile: { ownerUserId: req.user!.id } } }); if (!page) return { ok: false, error: { code: 'not_found', message: 'Page not found.' } }; await this.prisma.$transaction(input.orderedBlockIds.map((id, position) => this.prisma.block.updateMany({ where: { id, pageId }, data: { position, version: { increment: 1 } } }))); return { ok: true, data: await this.prisma.block.findMany({ where: { pageId }, orderBy: { position: 'asc' } }) }; }
}

@Controller('api/v1/profiles/:profileId/theme')
@UseGuards(SessionGuard)
export class ThemeController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async get(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { const profile = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: req.user!.id }, select: { theme: true, version: true } }); return profile ? { ok: true, data: profile.theme } : { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; }
  @Put()
  async save(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { const input = parseBody(z.object({ theme: z.record(z.string(), z.unknown()), expectedVersion: z.number().int().positive() }), body); const profile = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: req.user!.id } }); if (!profile) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; if (profile.version !== input.expectedVersion) return { ok: false, error: { code: 'conflict', message: 'Profile changed since it was opened.', currentVersion: profile.version } }; const saved = await this.prisma.profile.update({ where: { id: profileId }, data: { theme: input.theme as any, version: { increment: 1 } }, select: { theme: true } }); return { ok: true, data: saved.theme }; }
}
