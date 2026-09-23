import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { hashToken, idSchema, parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { PrismaService } from './prisma.service';

const field = z.object({ id: z.string().min(1), kind: z.string().min(1), name: z.string().min(1), label: z.unknown(), required: z.boolean().default(false), options: z.array(z.string()).optional() });
const formSchema = z.object({ title: z.unknown(), description: z.unknown().optional(), submitLabel: z.unknown(), successMessage: z.unknown(), fields: z.array(field).min(1), enabled: z.boolean().default(true), expectedVersion: z.number().int().positive().optional() });
const formValues = z.record(z.string(), z.union([z.string(), z.boolean(), z.array(z.string())]));
const ownedProfile = (prisma: PrismaService, userId: string, profileId: string) => prisma.profile.findFirst({ where: { id: profileId, ownerUserId: userId }, select: { id: true } });

@Controller('api/v1/profiles/:profileId/forms')
@UseGuards(SessionGuard)
export class FormController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { if (!(await ownedProfile(this.prisma, req.user!.id, profileId))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; return { ok: true, data: await this.prisma.form.findMany({ where: { profileId }, orderBy: { updatedAt: 'desc' } }) }; }
  @Post()
  async create(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Body() body: unknown) { if (!(await ownedProfile(this.prisma, req.user!.id, profileId))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; const input = parseBody(formSchema, body); return { ok: true, data: await this.prisma.form.create({ data: { profileId, title: input.title as any, description: input.description as any, submitLabel: input.submitLabel as any, successMessage: input.successMessage as any, fields: input.fields as any, enabled: input.enabled } }) }; }
  @Patch(':formId')
  async update(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('formId') formId: string, @Body() body: unknown) { const input = parseBody(formSchema, body); const form = await this.prisma.form.findFirst({ where: { id: formId, profileId, profile: { ownerUserId: req.user!.id } } }); if (!form) return { ok: false, error: { code: 'not_found', message: 'Form not found.' } }; if (input.expectedVersion !== undefined && input.expectedVersion !== form.version) return { ok: false, error: { code: 'conflict', message: 'Form changed since it was opened.', currentVersion: form.version } }; return { ok: true, data: await this.prisma.form.update({ where: { id: formId }, data: { title: input.title as any, description: input.description as any, submitLabel: input.submitLabel as any, successMessage: input.successMessage as any, fields: input.fields as any, enabled: input.enabled, version: { increment: 1 } } }) }; }
  @Delete(':formId')
  async remove(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('formId') formId: string) { const deleted = await this.prisma.form.deleteMany({ where: { id: formId, profileId, profile: { ownerUserId: req.user!.id } } }); return deleted.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'Form not found.' } }; }
}

@Controller('public/v1/forms')
export class PublicFormController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Post(':formId/submissions')
  async submit(@Param('formId') formId: string, @Body() body: unknown, @Req() req: any) { const values = parseBody(formValues, body); const form = await this.prisma.form.findUnique({ where: { id: formId } }); if (!form || !form.enabled) return { ok: false, error: { code: 'not_found', message: 'Form is not available.' } }; const fields = form.fields as Array<{ name: string; required?: boolean }>; const missing = fields.filter((item) => item.required && (values[item.name] === undefined || values[item.name] === '')).map((item) => item.name); if (missing.length) return { ok: false, error: { code: 'validation', message: 'Required fields are missing.', fields: missing } }; const submission = await this.prisma.formSubmission.create({ data: { formId, profileId: form.profileId, values: values as any, pageUrl: req.headers.referer, userAgent: req.headers['user-agent'] } }); await this.prisma.analyticsEvent.create({ data: { profileId: form.profileId, pageId: form.pageId, blockId: form.blockId, type: 'FORM_SUBMIT' } }); return { ok: true, data: { id: submission.id, successMessage: form.successMessage } }; }
}

@Controller('api/v1/profiles/:profileId/submissions')
@UseGuards(SessionGuard)
export class SubmissionController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { if (!(await ownedProfile(this.prisma, req.user!.id, profileId))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; return { ok: true, data: await this.prisma.formSubmission.findMany({ where: { profileId }, orderBy: { submittedAt: 'desc' }, take: 100 }) }; }
  @Patch(':submissionId')
  async markRead(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('submissionId') submissionId: string, @Body() body: unknown) { const input = parseBody(z.object({ read: z.boolean() }), body); const updated = await this.prisma.formSubmission.updateMany({ where: { id: submissionId, profileId, profile: { ownerUserId: req.user!.id } }, data: { read: input.read } }); return updated.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'Submission not found.' } }; }
  @Delete(':submissionId')
  async remove(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('submissionId') submissionId: string) { const deleted = await this.prisma.formSubmission.deleteMany({ where: { id: submissionId, profileId, profile: { ownerUserId: req.user!.id } } }); return deleted.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'Submission not found.' } }; }
}

@Controller('public/v1/profiles/:profileId/subscribers')
export class PublicSubscriberController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Post()
  async subscribe(@Param('profileId') profileId: string, @Body() body: unknown) { const input = parseBody(z.object({ email: z.string().trim().toLowerCase().email(), pageId: idSchema.optional(), blockId: idSchema.optional() }), body); const token = randomBytes(32).toString('base64url'); const subscriber = await this.prisma.subscriber.upsert({ where: { profileId_email: { profileId, email: input.email } }, update: { status: 'PENDING', confirmedAt: null, confirmationHash: hashToken(token), unsubscribedAt: null }, create: { profileId, email: input.email, confirmationHash: hashToken(token), source: { pageId: input.pageId, blockId: input.blockId } } }); return { ok: true, data: { subscriberId: subscriber.id, status: subscriber.status, confirmationToken: token } }; }
}

@Controller('api/v1/profiles/:profileId/subscribers')
@UseGuards(SessionGuard)
export class SubscriberController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string) { if (!(await ownedProfile(this.prisma, req.user!.id, profileId))) return { ok: false, error: { code: 'not_found', message: 'Profile not found.' } }; return { ok: true, data: await this.prisma.subscriber.findMany({ where: { profileId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, profileId: true, email: true, status: true, createdAt: true, confirmedAt: true, unsubscribedAt: true, source: true } }) }; }
  @Post(':subscriberId/confirm')
  async confirm(@Param('profileId') profileId: string, @Param('subscriberId') subscriberId: string, @Body() body: unknown) { const input = parseBody(z.object({ token: z.string().min(20) }), body); const updated = await this.prisma.subscriber.updateMany({ where: { id: subscriberId, profileId, confirmationHash: hashToken(input.token) }, data: { status: 'ACTIVE', confirmedAt: new Date(), confirmationHash: null } }); return updated.count ? { ok: true, data: null } : { ok: false, error: { code: 'validation', message: 'Invalid confirmation token.' } }; }
  @Delete(':subscriberId')
  async remove(@Req() req: AuthenticatedRequest, @Param('profileId') profileId: string, @Param('subscriberId') subscriberId: string) { const deleted = await this.prisma.subscriber.deleteMany({ where: { id: subscriberId, profileId, profile: { ownerUserId: req.user!.id } } }); return deleted.count ? { ok: true, data: null } : { ok: false, error: { code: 'not_found', message: 'Subscriber not found.' } }; }
}
