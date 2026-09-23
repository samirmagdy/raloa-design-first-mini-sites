import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from './common';
import { PrismaService } from './prisma.service';
import { SessionGuard, type AuthenticatedRequest } from './common';

@Controller('public/v1/profiles/:profileId/events')
export class AnalyticsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Post()
  async record(@Param('profileId') profileId: string, @Body() body: unknown) { const input = parseBody(z.object({ type: z.enum(['VIEW', 'CLICK', 'FORM_SUBMIT']), pageId: z.string().uuid().optional(), blockId: z.string().uuid().optional(), visitorHash: z.string().max(128).optional(), referrer: z.string().max(500).optional(), utm: z.record(z.string(), z.string()).optional(), userAgent: z.string().max(500).optional() }), body); await this.prisma.analyticsEvent.create({ data: { profileId, ...input, type: input.type } }); return { ok: true, data: null }; }
}

@Controller('api/v1/profiles/:profileId/analytics')
@UseGuards(SessionGuard)
export class AnalyticsSnapshotController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async snapshot(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Req() request: any) {
    const profile = await this.prisma.profile.findFirst({ where: { id: profileId, ownerUserId: req.user!.id } });
    if (!profile) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } };
    const range = Math.min(Math.max(Number(request.query?.days ?? 7), 1), 90);
    const since = new Date(Date.now() - range * 86_400_000);
    const events = await this.prisma.analyticsEvent.findMany({ where: { profileId, occurredAt: { gte: since } }, orderBy: { occurredAt: 'asc' } });
    const views = events.filter((event) => event.type === 'VIEW');
    const clicks = events.filter((event) => event.type === 'CLICK');
    const visitorKeys = new Set(views.map((event) => event.visitorHash).filter(Boolean));
    const byDay = new Map<string, { views: number; clicks: number }>();
    for (let offset = range - 1; offset >= 0; offset -= 1) { const day = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10); byDay.set(day, { views: 0, clicks: 0 }); }
    for (const event of events) { const day = event.occurredAt.toISOString().slice(0, 10); const bucket = byDay.get(day); if (bucket) bucket[event.type === 'VIEW' ? 'views' : 'clicks'] += 1; }
    const linkCounts = new Map<string, number>(); for (const click of clicks) if (click.blockId) linkCounts.set(click.blockId, (linkCounts.get(click.blockId) ?? 0) + 1);
    return { ok: true, data: { views: views.length, uniqueVisitors: visitorKeys.size, linkClicks: clicks.length, formSubmissions: events.filter((event) => event.type === 'FORM_SUBMIT').length, clickThroughRate: views.length ? clicks.length / views.length : 0, timeline: [...byDay].map(([date, values]) => ({ date, ...values })), topLinks: [...linkCounts].map(([blockId, count]) => ({ blockId, clicks: count, clickThroughRate: views.length ? count / views.length : 0 })).sort((a, b) => b.clicks - a.clicks).slice(0, 10), referrers: [], campaigns: [] } };
  }
}
