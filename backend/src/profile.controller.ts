import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import argon2 from 'argon2';
import { z } from 'zod';
import type { AuthenticatedRequest } from './common';
import { idSchema, localized, parseBody, SessionGuard } from './common';
import { PrismaService } from './prisma.service';

const profileInput = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,29}$/), displayName: z.string().trim().min(1).max(120), role: localized.optional(), bio: localized.optional() });
const profilePatch = profileInput.partial().extend({ avatarUrl: z.string().url().nullable().optional(), published: z.boolean().optional(), seo: z.record(z.string(), z.unknown()).optional(), socials: z.array(z.record(z.string(), z.unknown())).optional(), expectedVersion: z.number().int().positive() });
const reserved = new Set(['admin', 'api', 'auth', 'settings', 'studio', 'support', 'www']);

const shapeProfile = (profile: any) => ({ ...profile, ownerId: profile.ownerUserId, version: profile.version });

@Controller('api/v1/profiles')
@UseGuards(SessionGuard)
export class ProfileController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) { const profiles = await this.prisma.profile.findMany({ where: { ownerUserId: request.user!.id }, orderBy: { updatedAt: 'desc' } }); return { ok: true, data: profiles.map(shapeProfile) }; }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: unknown) { const input = parseBody(profileInput, body); if (reserved.has(input.username)) return { ok: false, error: { code: 'validation', message: 'That username is reserved.' } }; const exists = await this.prisma.profile.findUnique({ where: { username: input.username } }); if (exists) return { ok: false, error: { code: 'validation', message: 'That username is taken.' } }; const profile = await this.prisma.profile.create({ data: { ownerUserId: request.user!.id, username: input.username, displayName: input.displayName, role: input.role ?? { en: '', ar: '' }, bio: input.bio ?? { en: '', ar: '' }, seo: { title: input.displayName, description: input.bio ?? '', indexable: false }, socials: [], theme: {} } }); return { ok: true, data: shapeProfile(profile) }; }

  @Get('usage')
  async usage(@Req() request: AuthenticatedRequest) {
    const profiles = await this.prisma.profile.findMany({ where: { ownerUserId: request.user!.id }, include: { pages: { include: { blocks: true } } } });
    const subscription = await this.prisma.subscription.findFirst({ where: { userId: request.user!.id, status: 'ACTIVE' } });
    const plan = subscription?.plan === 'business' ? 'business' : subscription?.plan === 'creator' ? 'creator' : 'free';
    const limits = { free: { profiles: 2, pages: 3, blocks: 25, visits: 10_000 }, creator: { profiles: 12, pages: 10, blocks: 150, visits: 50_000 }, business: { profiles: 40, pages: 40, blocks: 500, visits: 500_000 } }[plan];
    const pages = profiles.flatMap((profile) => profile.pages);
    return { ok: true, data: { plan, profilesUsed: profiles.length, profileLimit: limits.profiles, pagesUsed: pages.length, pageLimit: limits.pages, blocksUsed: pages.reduce((total, page) => total + page.blocks.length, 0), blockLimit: limits.blocks, monthlyVisits: 0, visitLimit: limits.visits } };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) { const profile = await this.prisma.profile.findFirst({ where: { id: parseBody(idSchema, id), ownerUserId: request.user!.id } }); return { ok: true, data: profile ? shapeProfile(profile) : null }; }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) { const profileId = parseBody(idSchema, id); const input = parseBody(profilePatch, body); const current = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: request.user!.id } }); if (!current) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; if (current.version !== input.expectedVersion) return { ok: false, error: { code: 'conflict', message: 'Profile changed since it was opened.', currentVersion: current.version } }; const { expectedVersion: _, ...patch } = input; const updated = await this.prisma.profile.update({ where: { id: profileId }, data: { ...(patch as any), version: { increment: 1 } } }); return { ok: true, data: shapeProfile(updated) }; }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) { const profileId = parseBody(idSchema, id); const count = await this.prisma.profile.deleteMany({ where: { id: profileId, ownerUserId: request.user!.id } }); return count.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; }

  @Post(':id/duplicate')
  async duplicate(@Req() request: AuthenticatedRequest, @Param('id') id: string) { const profileId = parseBody(idSchema, id); const source = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: request.user!.id }, include: { pages: { include: { blocks: true }, orderBy: { position: 'asc' } } } }); if (!source) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const username = `${source.username}-copy-${Date.now().toString(36).slice(-4)}`.slice(0, 30); const copy = await this.prisma.$transaction(async (tx) => { const created = await tx.profile.create({ data: { ownerUserId: source.ownerUserId, username, displayName: `${source.displayName} copy`, role: source.role as any, bio: source.bio as any, avatarUrl: source.avatarUrl, seo: source.seo as any, socials: source.socials as any, theme: source.theme as any } }); for (const page of source.pages) { const newPage = await tx.page.create({ data: { profileId: created.id, title: page.title as any, slug: page.slug, description: page.description as any, published: false, visibility: 'DRAFT', position: page.position } }); for (const block of page.blocks) await tx.block.create({ data: { pageId: newPage.id, parentId: null, type: block.type, title: block.title as any, subtitle: block.subtitle as any, content: block.content as any, url: block.url, config: block.config as any, position: block.position, visible: block.visible, startsAt: block.startsAt, endsAt: block.endsAt } }); } return created; }); return { ok: true, data: shapeProfile(copy) }; }
}

@Controller('public/v1')
export class PublicController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get('profiles/:username')
  async get(@Param('username') username: string) {
    const now = new Date();
    const profile = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        pages: {
          where: { published: true, visibility: 'PUBLIC' },
          orderBy: { position: 'asc' },
          include: {
            blocks: {
              where: { visible: true, passwordProtected: false, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
              orderBy: { position: 'asc' }
            }
          }
        }
      }
    });
    if (!profile || !profile.published) return { ok: true, data: null };
    return { ok: true, data: shapeProfile(profile) };
  }

  @Post('blocks/:blockId/unlock')
  async unlock(@Param('blockId') blockId: string, @Body() body: unknown) { const input = parseBody(z.object({ password: z.string().min(1).max(200) }), body); const block = await this.prisma.block.findUnique({ where: { id: blockId }, include: { page: { include: { profile: true } } } }); if (!block || !block.passwordProtected || !block.passwordHash || !block.page.published || block.page.visibility !== 'PUBLIC' || !block.page.profile.published) return { ok: false, error: { code: 'not_found', message: 'Protected block not found.' } }; const now = new Date(); if ((block.startsAt && block.startsAt > now) || (block.endsAt && block.endsAt <= now)) return { ok: false, error: { code: 'not_found', message: 'Protected block not available.' } }; if (!(await argon2.verify(block.passwordHash, input.password))) return { ok: false, error: { code: 'unauthorized', message: 'Incorrect password.' } }; const { passwordHash: _passwordHash, ...safe } = block; return { ok: true, data: safe }; }
}
