import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import Stripe from 'stripe';
import { z } from 'zod';
import { parseBody, SessionGuard, type AuthenticatedRequest } from './common';
import { loadConfig } from './config';
import { PrismaService } from './prisma.service';

const plans = { creator: ['customDomain', 'analytics', 'forms'], business: ['customDomain', 'analytics', 'forms', 'apiAccess', 'integrations'] } as const;

@Controller('api/v1/billing')
export class BillingController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @UseGuards(SessionGuard)
  @Get('entitlements')
  async entitlements(@Req() req: AuthenticatedRequest) { const entries = await this.prisma.entitlement.findMany({ where: { userId: req.user!.id } }); return { ok: true, data: entries }; }
  @UseGuards(SessionGuard)
  @Post('checkout')
  async checkout(@Req() req: AuthenticatedRequest, @Body() body: unknown) { const input = parseBody(z.object({ plan: z.enum(['creator', 'business']) }), body); const config = loadConfig(); if (!config.STRIPE_SECRET_KEY) return { ok: false, error: { code: 'billing_unconfigured', message: 'Stripe billing is not configured.' } }; const stripe = new Stripe(config.STRIPE_SECRET_KEY); const user = await this.prisma.user.findUnique({ where: { id: req.user!.id }, include: { subscriptions: true } }); if (!user) return { ok: false, error: { code: 'not_found', message: 'User not found.' } }; let customerId = user.subscriptions[0]?.stripeCustomerId; if (!customerId) customerId = (await stripe.customers.create({ email: user.email, metadata: { userId: user.id } })).id; const price = input.plan === 'creator' ? config.STRIPE_PRICE_CREATOR : config.STRIPE_PRICE_BUSINESS; if (!price) return { ok: false, error: { code: 'billing_unconfigured', message: 'Stripe price is not configured.' } }; const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer: customerId, line_items: [{ price, quantity: 1 }], success_url: `${config.PUBLIC_APP_URL}/settings?billing=success`, cancel_url: `${config.PUBLIC_APP_URL}/settings?billing=cancelled`, metadata: { userId: user.id, plan: input.plan } }); const existing = user.subscriptions[0]; if (existing) await this.prisma.subscription.update({ where: { id: existing.id }, data: { stripeCustomerId: customerId } }); else await this.prisma.subscription.create({ data: { userId: user.id, stripeCustomerId: customerId, plan: 'free', status: 'INCOMPLETE' } }); return { ok: true, data: { url: session.url } }; }
  @UseGuards(SessionGuard)
  @Post('portal')
  async portal(@Req() req: AuthenticatedRequest) { const config = loadConfig(); if (!config.STRIPE_SECRET_KEY) return { ok: false, error: { code: 'billing_unconfigured', message: 'Stripe billing is not configured.' } }; const subscription = await this.prisma.subscription.findFirst({ where: { userId: req.user!.id } }); if (!subscription?.stripeCustomerId) return { ok: false, error: { code: 'not_found', message: 'No billing customer exists.' } }; const stripe = new Stripe(config.STRIPE_SECRET_KEY); const session = await stripe.billingPortal.sessions.create({ customer: subscription.stripeCustomerId, return_url: `${config.PUBLIC_APP_URL}/settings` }); return { ok: true, data: { url: session.url } }; }
}

@Controller('webhooks')
export class StripeWebhookController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Post('stripe')
  async stripe(@Req() req: any) { const config = loadConfig(); if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) return { ok: false, error: { code: 'billing_unconfigured', message: 'Stripe webhook is not configured.' } }; const stripe = new Stripe(config.STRIPE_SECRET_KEY); let event: Stripe.Event; try { event = stripe.webhooks.constructEvent(req.rawBody ?? Buffer.from(JSON.stringify(req.body)), req.headers['stripe-signature'], config.STRIPE_WEBHOOK_SECRET); } catch { return { ok: false, error: { code: 'invalid_signature', message: 'Invalid Stripe signature.' } }; } if (event.type === 'checkout.session.completed') { const session = event.data.object as Stripe.Checkout.Session; const userId = session.metadata?.userId; if (userId && session.customer) { const data = { stripeCustomerId: String(session.customer), stripeSubscriptionId: String(session.subscription ?? ''), status: 'ACTIVE' as const, plan: session.metadata?.plan ?? 'creator' }; const existing = await this.prisma.subscription.findFirst({ where: { userId } }); if (existing) await this.prisma.subscription.update({ where: { id: existing.id }, data }); else await this.prisma.subscription.create({ data: { userId, ...data } }); } }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') { const subscription = event.data.object as Stripe.Subscription; const local = await this.prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } }); if (local) { const plan = local.plan; await this.prisma.subscription.update({ where: { id: local.id }, data: { status: event.type.endsWith('deleted') ? 'CANCELED' : subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE', currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : Date.now()), cancelAtPeriodEnd: subscription.cancel_at_period_end } }); if (event.type.endsWith('deleted')) await this.prisma.entitlement.updateMany({ where: { userId: local.userId }, data: { enabled: false } }); else for (const key of plans[plan as keyof typeof plans] ?? []) await this.prisma.entitlement.upsert({ where: { userId_key: { userId: local.userId, key } }, update: { enabled: true }, create: { userId: local.userId, key, enabled: true } }); } }
    return { received: true };
  }
}
