import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './common';
import { hashToken, parseBody, SessionGuard } from './common';
import { PrismaService } from './prisma.service';
import { z } from 'zod';

const credentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200) });
const cookieName = 'raloa_session';

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const input = parseBody(credentials, body);
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return { ok: false, error: { code: 'validation', message: 'Email is already registered.' } };
    const user = await this.prisma.user.create({ data: { email: input.email, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }) } });
    await this.issueSession(user.id, response);
    return { ok: true, data: { id: user.id, email: user.email, locale: user.locale, timezone: user.timezone } };
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const input = parseBody(credentials, body);
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return { ok: false, error: { code: 'unauthorized', message: 'Invalid email or password.' } };
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.issueSession(user.id, response);
    return { ok: true, data: { id: user.id, email: user.email, locale: user.locale, timezone: user.timezone } };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) { return { ok: true, data: request.user }; }

  @UseGuards(SessionGuard)
  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const token = (request as any).cookies?.[cookieName] as string | undefined;
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    response.clearCookie(cookieName, { path: '/' });
    return { ok: true, data: null };
  }

  private async issueSession(userId: string, response: FastifyReply) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    response.setCookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
}
