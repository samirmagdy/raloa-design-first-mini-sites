import 'reflect-metadata';
import { config as loadDotEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadConfig } from './config';
import { PrismaService } from './prisma.service';
import { HttpErrorFilter } from './http-error.filter';
import { metrics, recordRequest } from './metrics';

loadDotEnv({ path: 'backend/.env' });

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }), { rawBody: true });
  await app.register(cookie, { secret: config.SESSION_SECRET });
  await app.register(cors, { origin: config.FRONTEND_ORIGIN, credentials: true });
  await app.register(helmet);
  app.getHttpAdapter().getInstance().addHook('onRequest', async () => { recordRequest(); });
  app.useGlobalFilters(new HttpErrorFilter());
  app.setGlobalPrefix('');
  app.enableShutdownHooks();
  const swagger = new DocumentBuilder().setTitle('RALOA API').setDescription('Versioned RALOA REST API').setVersion('1.0').addCookieAuth('raloa_session').build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  app.getHttpAdapter().get('/health', async () => ({ ok: true, data: { status: 'ok', service: 'raloa-api' } }));
  app.getHttpAdapter().get('/metrics', async () => ({ ok: true, data: metrics }));
  app.getHttpAdapter().get('/ready', async (_request: unknown, reply: any) => { try { await app.get(PrismaService).$queryRaw`SELECT 1`; return reply.send({ ok: true, data: { status: 'ready' } }); } catch { return reply.code(503).send({ ok: false, error: { code: 'not_ready', message: 'Database unavailable.' } }); } });
  await app.listen(config.PORT, '0.0.0.0');
}

void bootstrap();
