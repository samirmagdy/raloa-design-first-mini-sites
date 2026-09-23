import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard, requireApiScope, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';

@Controller('developer/v1')
@UseGuards(ApiKeyGuard)
export class DeveloperController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('profiles/:profileId')
  async profile(@Req() request: AuthenticatedRequest, @Param('profileId') profileId: string) {
    requireApiScope(request, 'profiles:read');
    if (request.apiKey!.profileId !== profileId) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, include: { pages: { where: { published: true, visibility: 'PUBLIC' }, orderBy: { position: 'asc' }, include: { blocks: { where: { visible: true }, orderBy: { position: 'asc' } } } } } });
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
    const subscribers = await this.prisma.subscriber.findMany({ where: { profileId }, select: { id: true, email: true, status: true, createdAt: true, confirmedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { ok: true, data: subscribers };
  }
}
