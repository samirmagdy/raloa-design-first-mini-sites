import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { loadConfig } from './config';
import { PrismaService } from './prisma.service';

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

@Controller()
export class SeoController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get('robots.txt')
  robots(@Res() response: FastifyReply) { const config = loadConfig(); return response.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${config.PUBLIC_APP_URL}/sitemap.xml\n`); }
  @Get('sitemap.xml')
  async sitemap(@Res() response: FastifyReply) { const config = loadConfig(); const profiles = await this.prisma.profile.findMany({ where: { published: true }, select: { username: true, updatedAt: true } }); const urls = profiles.map((profile) => `<url><loc>${xml(`${config.PUBLIC_APP_URL}/@${profile.username}`)}</loc><lastmod>${profile.updatedAt.toISOString()}</lastmod></url>`).join(''); return response.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`); }
}
