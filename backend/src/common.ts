import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { z, type ZodType } from 'zod';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from './prisma.service';

export type AuthenticatedRequest = FastifyRequest & { user?: { id: string; email: string } };

export const parseBody = <T>(schema: ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException({ code: 'validation', message: 'Request validation failed', fields: result.error.flatten() });
  return result.data;
};

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const localized = z.union([z.string(), z.object({ en: z.string(), ar: z.string().optional() })]);
export const idSchema = z.string().uuid();

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request as any).cookies?.raloa_session as string | undefined;
    if (!token) throw new UnauthorizedException({ code: 'unauthorized', message: 'Sign in to continue.' });
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedException({ code: 'unauthorized', message: 'Session expired.' });
    request.user = { id: session.user.id, email: session.user.email };
    return true;
  }
}

export const errorEnvelope = (error: unknown) => ({ ok: false, error: { code: 'server', message: error instanceof Error ? error.message : 'Unexpected server error' } });
