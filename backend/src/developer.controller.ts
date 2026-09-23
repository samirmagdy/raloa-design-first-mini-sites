import { Body, Controller, Get, Inject, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard, requireApiScope, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';
import { parseBody } from './common';
import { z } from 'zod';

@Controller('developer/v1')
@UseGuards(ApiKeyGuard)
export class DeveloperController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('profiles/:profileId')
  async profile(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string) {
    requireApiScope(request, 'profiles:read');
    if (request.apiKey!.profileId !== profileId) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
    const now = new Date();
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
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
    return profile ? { ok: true, data: profile } : { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
  }

  @Get('profiles/:profileId/analytics')
  async analytics(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string) {
    requireApiScope(request, 'analytics:read');
    if (request.apiKey!.profileId !== profileId) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
    const events = await this.prisma.analyticsEvent.groupBy({ by: ['type'], where: { profileId }, _count: { _all: true } });
    return { ok: true, data: { profileId, events: events.map((event) => ({ type: event.type, count: event._count._all })) } };
  }

  @Get('profiles/:profileId/subscribers')
  async subscribers(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string) {
    requireApiScope(request, 'subscribers:read');
    if (request.apiKey!.profileId !== profileId) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
    const subscribers = await this.prisma.subscriber.findMany({ where: { profileId }, select: { id: true, email: true, status: true, createdAt: true, confirmedAt: true }, orderBy: { createdAt: 'desc' }, take: 101 });
    return { ok: true, data: { items: subscribers.slice(0, 100), nextCursor: subscribers.length > 100 ? subscribers[99].id : null } };
  }

  @Patch('profiles/:profileId')
  async updateProfile(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { requireApiScope(request, 'profiles:write'); if (request.apiKey!.profileId !== profileId) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const input = parseBody(z.object({ displayName: z.string().trim().min(1).max(120), expectedVersion: z.number().int().positive() }), body); const current = await this.prisma.profile.findUnique({ where: { id: profileId } }); if (!current || current.version !== input.expectedVersion) return { ok: false, error: { code: 'conflict', message: 'Profile changed since it was opened.', currentVersion: current?.version } }; const updated = await this.prisma.profile.update({ where: { id: profileId }, data: { displayName: input.displayName, version: { increment: 1 } } }); return { ok: true, data: updated }; }
}
