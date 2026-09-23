import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { z, type ZodType } from 'zod';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from './prisma.service';
import Redis from 'ioredis';

export type AuthenticatedRequest = FastifyRequest & { user?: { id: string; email: string } };

export const parseBody = <T>(schema: ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException({ code: 'validation', message: 'Request validation failed', fields: result.error.flatten() });
  return result.data;
};

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
export const cacheSession = async (tokenHash: string, userId: string, ttlSeconds: number) => { if (!redis) return; try { if (redis.status === 'wait') await redis.connect(); await redis.set(`session:${tokenHash}`, userId, 'EX', ttlSeconds); } catch { /* database session remains authoritative when Redis is unavailable */ } };
export const readCachedSession = async (tokenHash: string) => { if (!redis) return null; try { if (redis.status === 'wait') await redis.connect(); return await redis.get(`session:${tokenHash}`); } catch { return null; } };
export const deleteCachedSession = async (tokenHash: string) => { if (!redis) return; try { if (redis.status === 'wait') await redis.connect(); await redis.del(`session:${tokenHash}`); } catch { /* best effort */ } };
export const localized = z.union([z.string(), z.object({ en: z.string(), ar: z.string().optional() })]);
export const idSchema = z.string().uuid();

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request as any).cookies?.raloa_session as string | undefined;
    if (!token) throw new UnauthorizedException({ code: 'unauthorized', message: 'Sign in to continue.' });
    const tokenHash = hashToken(token);
    const cachedUserId = await readCachedSession(tokenHash);
    const session = cachedUserId
      ? await this.prisma.session.findFirst({ where: { tokenHash, userId: cachedUserId }, include: { user: true } })
      : await this.prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedException({ code: 'unauthorized', message: 'Session expired.' });
    request.user = { id: session.user.id, email: session.user.email };
    return true;
  }
}

export const errorEnvelope = (error: unknown) => ({ ok: false, error: { code: 'server', message: error instanceof Error ? error.message : 'Unexpected server error' } });
