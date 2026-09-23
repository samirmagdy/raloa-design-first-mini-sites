import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from './common';
import { PrismaService } from './prisma.service';

@Controller('public/v1/profiles/:profileId/events')
export class AnalyticsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Post()
  async record(@Param('profileId') profileId: string, @Body() body: unknown) { const input = parseBody(z.object({ type: z.enum(['VIEW', 'CLICK', 'FORM_SUBMIT']), pageId: z.string().uuid().optional(), blockId: z.string().uuid().optional(), visitorHash: z.string().max(128).optional(), referrer: z.string().max(500).optional(), utm: z.record(z.string(), z.string()).optional(), userAgent: z.string().max(500).optional() }), body); await this.prisma.analyticsEvent.create({ data: { profileId, ...input, type: input.type } }); return { ok: true, data: null }; }
}
