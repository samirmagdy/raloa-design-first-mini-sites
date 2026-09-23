import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PrismaService } from './prisma.service';

const escape = (value: string) => value.replace(/[<&>"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
@Controller('public/v1/profiles')
export class OgController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get(':username/og.svg')
  async render(@Param('username') username: string, @Res() response: FastifyReply) { const profile = await this.prisma.profile.findUnique({ where: { username: username.toLowerCase() }, select: { displayName: true, role: true, published: true, avatarUrl: true } }); if (!profile?.published) return response.code(404).send(); const role = typeof profile.role === 'object' && profile.role !== null && 'en' in profile.role ? String((profile.role as any).en) : ''; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f7f3ea"/><stop offset="1" stop-color="#dce8e1"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1030" cy="120" r="180" fill="#ff6b4a" opacity=".15"/><text x="90" y="300" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="#0f172a">${escape(profile.displayName)}</text><text x="94" y="365" font-family="Arial,sans-serif" font-size="30" fill="#475569">${escape(role)}</text><text x="94" y="550" font-family="Arial,sans-serif" font-size="24" fill="#64748b">RALOA</text></svg>`; return response.type('image/svg+xml').header('cache-control', 'public, max-age=3600').send(svg); }
}
