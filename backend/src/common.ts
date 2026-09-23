import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { z, type ZodType } from 'zod';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from './prisma.service';
import Redis from 'ioredis';

export type AuthenticatedRequest = FastifyRequest & { user?: { id: string; email: string }; apiKey?: { id: string; profileId: string; scopes: string[] } };

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
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();
export const consumeRateLimit = async (key: string, limit: number, windowSeconds: number) => {
  const now = Date.now();
  if (redis) {
    try { if (redis.status === 'wait') await redis.connect(); const bucket = `rate:${key}:${Math.floor(now / (windowSeconds * 1000))}`; const count = await redis.incr(bucket); if (count === 1) await redis.expire(bucket, windowSeconds); return count <= limit; } catch { /* fall through to local limiter */ }
  }
  const current = memoryRateLimits.get(key);
  if (!current || current.resetAt <= now) { memoryRateLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 }); return true; }
  current.count += 1;
  return current.count <= limit;
};
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

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException({ code: 'unauthorized', message: 'A developer API key is required.' });
    const key = await this.prisma.apiKey.findUnique({ where: { tokenHash: hashToken(token) }, include: { profile: { include: { owner: true } } } });
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= new Date())) throw new UnauthorizedException({ code: 'unauthorized', message: 'Invalid or expired API key.' });
    request.user = { id: key.profile.ownerUserId, email: key.profile.owner.email };
    request.apiKey = { id: key.id, profileId: key.profileId, scopes: Array.isArray(key.scopes) ? key.scopes.filter((scope): scope is string => typeof scope === 'string') : [] };
    await this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return true;
  }
}

export const requireApiScope = (request: AuthenticatedRequest, scope: string) => {
  if (!request.apiKey?.scopes.includes(scope)) throw new UnauthorizedException({ code: 'forbidden', message: `API key lacks ${scope} scope.` });
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ip = request.ip ?? 'unknown';
    const route = request.url.split('?')[0];
    const limit = route.startsWith('/public/v1') ? 60 : 120;
    if (!(await consumeRateLimit(`${ip}:${route}`, limit, 60))) throw new HttpException({ code: 'rate_limited', message: 'Too many requests. Try again shortly.' }, HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}

export const errorEnvelope = (error: unknown) => ({ ok: false, error: { code: 'server', message: error instanceof Error ? error.message : 'Unexpected server error' } });
