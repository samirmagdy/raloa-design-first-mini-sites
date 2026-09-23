import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { loadConfig } from './config';

@Injectable()
export class EmailService {
  async sendVerification(to: string, token: string) { const config = loadConfig(); return this.send(to, 'Verify your RALOA email', `<p>Verify your email to finish setting up RALOA.</p><p><a href="${config.PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}">Verify email</a></p>`); }
  async sendPasswordReset(to: string, token: string) { const config = loadConfig(); return this.send(to, 'Reset your RALOA password', `<p>We received a request to reset your password.</p><p><a href="${config.PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}">Reset password</a></p><p>This link expires in one hour.</p>`); }
  private async send(to: string, subject: string, html: string) { const config = loadConfig(); if (!config.RESEND_API_KEY) throw new ServiceUnavailableException({ code: 'email_unconfigured', message: 'Transactional email is not configured.' }); const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject, html }) }); if (!response.ok) throw new ServiceUnavailableException({ code: 'email_delivery_failed', message: 'Email delivery failed.' }); }
}
