import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard, SessionGuard, ApiKeyGuard } from './common';
import { AuthController } from './auth.controller';
import { ProfileController, PublicController } from './profile.controller';
import { BlockController, PageController, ThemeController } from './content.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsSnapshotController } from './analytics.controller';
import { ApiKeyController } from './api-key.controller';
import { FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController } from './growth.controller';
import { DeveloperController } from './developer.controller';
import { EmailService } from './email.service';

@Module({ controllers: [AuthController, ProfileController, PublicController, PageController, BlockController, ThemeController, AnalyticsController, AnalyticsSnapshotController, ApiKeyController, FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController, DeveloperController], providers: [PrismaService, EmailService, SessionGuard, ApiKeyGuard, { provide: APP_GUARD, useClass: RateLimitGuard }], exports: [PrismaService, EmailService] })
export class AppModule {}
