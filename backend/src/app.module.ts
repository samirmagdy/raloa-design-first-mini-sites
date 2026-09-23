import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SessionGuard } from './common';
import { AuthController } from './auth.controller';
import { ProfileController, PublicController } from './profile.controller';
import { BlockController, PageController, ThemeController } from './content.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsSnapshotController } from './analytics.controller';
import { ApiKeyController } from './api-key.controller';
import { FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController } from './growth.controller';

@Module({ controllers: [AuthController, ProfileController, PublicController, PageController, BlockController, ThemeController, AnalyticsController, AnalyticsSnapshotController, ApiKeyController, FormController, PublicFormController, SubmissionController, PublicSubscriberController, SubscriberController], providers: [PrismaService, SessionGuard], exports: [PrismaService] })
export class AppModule {}
