import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { loadConfig } from './config';
import { getAnalyticsQueueStats } from './analytics.queue';
import { metrics } from './metrics';

@Controller('ops')
export class OperationsController {
  @Get('metrics')
  async getMetrics(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return { ok: true, data: { ...metrics, queue: await getAnalyticsQueueStats() } };
  }

  private authorize(authorization?: string) {
    const configured = loadConfig().OPS_DASHBOARD_TOKEN;
    const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!configured || provided !== configured) throw new UnauthorizedException({ code: 'unauthorized', message: 'Operations token is required.' });
  }
}
