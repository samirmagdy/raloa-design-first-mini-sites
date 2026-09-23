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
import { FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController, PublicUnsubscribeController } from './growth.controller';
import { DeveloperController } from './developer.controller';
import { EmailService } from './email.service';
import { MediaController } from './media.controller';
import { StorageService } from './storage.service';
import { SeoController } from './seo.controller';

@Module({ controllers: [AuthController, ProfileController, PublicController, PageController, BlockController, ThemeController, AnalyticsController, AnalyticsSnapshotController, ApiKeyController, FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController, PublicUnsubscribeController, DeveloperController, MediaController, SeoController], providers: [PrismaService, EmailService, StorageService, SessionGuard, ApiKeyGuard, { provide: APP_GUARD, useClass: RateLimitGuard }], exports: [PrismaService, EmailService, StorageService] })
export class AppModule {}
