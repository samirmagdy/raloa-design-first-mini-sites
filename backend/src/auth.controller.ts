import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './common';
import { cacheSession, deleteCachedSession, hashToken, parseBody, SessionGuard } from './common';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { z } from 'zod';

const credentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200) });
const cookieName = 'raloa_session';

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const input = parseBody(credentials, body);
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return { ok: false, error: { code: 'validation', message: 'Email is already registered.' } };
    const user = await this.prisma.user.create({ data: { email: input.email, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }) } });
    await this.issueSession(user.id, response);
    await this.createEmailVerification(user.id, user.email);
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
    if (token) { await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }); await deleteCachedSession(hashToken(token)); }
    response.clearCookie(cookieName, { path: '/' });
    return { ok: true, data: null };
  }

  @UseGuards(SessionGuard)
  @Post('logout-all')
  async logoutAll(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: FastifyReply) {
    await this.prisma.session.deleteMany({ where: { userId: request.user!.id } });
    response.clearCookie(cookieName, { path: '/' });
    return { ok: true, data: null };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: unknown) {
    const input = parseBody(z.object({ token: z.string().min(20) }), body);
    const token = await this.prisma.authToken.findFirst({ where: { tokenHash: hashToken(input.token), type: 'EMAIL_VERIFICATION', consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!token) return { ok: false, error: { code: 'validation', message: 'Invalid or expired verification token.' } };
    await this.prisma.$transaction([this.prisma.authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }), this.prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } })]);
    return { ok: true, data: { verified: true } };
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: unknown) {
    const input = parseBody(z.object({ email: z.string().trim().toLowerCase().email() }), body);
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (user) { const token = await this.createToken(user.id, 'PASSWORD_RESET', 60 * 60); await this.email.sendPasswordReset(user.email, token); }
    return { ok: true, data: { accepted: true } };
  }

  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() body: unknown) {
    const input = parseBody(z.object({ token: z.string().min(20), password: z.string().min(8).max(200) }), body);
    const token = await this.prisma.authToken.findFirst({ where: { tokenHash: hashToken(input.token), type: 'PASSWORD_RESET', consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!token) return { ok: false, error: { code: 'validation', message: 'Invalid or expired password reset token.' } };
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }), this.prisma.authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }), this.prisma.session.deleteMany({ where: { userId: token.userId } })]);
    return { ok: true, data: null };
  }

  @UseGuards(SessionGuard)
  @Post('change-password')
  async changePassword(@Req() request: AuthenticatedRequest, @Body() body: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const input = parseBody(z.object({ currentPassword: z.string().min(8), password: z.string().min(8).max(200) }), body);
    const user = await this.prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user || !(await argon2.verify(user.passwordHash, input.currentPassword))) return { ok: false, error: { code: 'validation', message: 'Current password is incorrect.' } };
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }) } });
    await this.prisma.session.deleteMany({ where: { userId: user.id } });
    response.clearCookie(cookieName, { path: '/' });
    return { ok: true, data: null };
  }

  @UseGuards(SessionGuard)
  @Get('export')
  async exportData(@Req() request: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: request.user!.id }, select: { id: true, email: true, locale: true, timezone: true, emailVerifiedAt: true, createdAt: true, profiles: { include: { pages: { include: { blocks: true } }, forms: true, subscribers: true } } } });
    return { ok: true, data: user };
  }

  @UseGuards(SessionGuard)
  @Post('delete-account')
  async deleteAccount(@Req() request: AuthenticatedRequest, @Body() body: unknown, @Res({ passthrough: true }) response: FastifyReply) {
    const input = parseBody(z.object({ password: z.string().min(8) }), body);
    const user = await this.prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return { ok: false, error: { code: 'validation', message: 'Password is incorrect.' } };
    await this.prisma.user.delete({ where: { id: user.id } });
    response.clearCookie(cookieName, { path: '/' });
    return { ok: true, data: null };
  }

  private async createToken(userId: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET', ttlSeconds: number) {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.authToken.deleteMany({ where: { userId, type } });
    await this.prisma.authToken.create({ data: { userId, type, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttlSeconds * 1000) } });
    return raw;
  }

  private async createEmailVerification(userId: string, email: string) {
    if (!process.env.RESEND_API_KEY) return;
    const token = await this.createToken(userId, 'EMAIL_VERIFICATION', 24 * 60 * 60);
    await this.email.sendVerification(email, token);
  }

  private async issueSession(userId: string, response: FastifyReply) {
    const token = randomBytes(32).toString('base64url');
    const ttl = 60 * 60 * 24 * 30;
    const tokenHashValue = hashToken(token);
    await this.prisma.session.create({ data: { userId, tokenHash: tokenHashValue, expiresAt: new Date(Date.now() + ttl * 1000) } });
    await cacheSession(tokenHashValue, userId, ttl);
    response.setCookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
}
