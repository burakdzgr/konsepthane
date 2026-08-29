import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { renderEmail } from './email-template';

/**
 * Transactional e-mail over SMTP (Mailpit locally, any provider in production).
 * Configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" for 465),
 * MAIL_FROM ("Konsepthane <no-reply@konsepthane.net>"). Failures are logged, never thrown to the
 * caller, so an outage of the mail provider does not break sign-up.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM ?? 'Konsepthane <noreply@konsepthane.net>';
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } }
      : {}),
  });

  private async send(to: string, subject: string, text: string, html: string) {
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (error) {
      this.logger.error(
        `mail to ${to} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  sendVerification(to: string, displayName: string, url: string) {
    const hello = displayName ? `Merhaba ${displayName},` : 'Merhaba,';
    const html = renderEmail({
      preheader: 'Konsepthane hesabını kullanmaya başlamak için e-posta adresini doğrula.',
      title: 'E-posta adresini doğrula',
      intro: `${hello} Konsepthane hesabını kullanmaya başlamak için e-posta adresini doğrulaman yeterli.`,
      cta_url: url,
      cta_label: 'E-POSTAMI DOĞRULA',
      note: 'Bu bağlantı 24 saat geçerlidir ve tek kullanımlıktır.',
    });
    return this.send(
      to,
      'Konsepthane · E-posta doğrulama',
      `${hello} E-posta adresini doğrulamak için bağlantı (24 saat geçerli): ${url}`,
      html,
    );
  }

  sendPasswordReset(to: string, displayName: string, url: string) {
    const hello = displayName ? `Merhaba ${displayName},` : 'Merhaba,';
    const html = renderEmail({
      preheader: 'Parolanı sıfırlamak için bağlantı (1 saat geçerli).',
      title: 'Parolanı sıfırla',
      intro: `${hello} Parolanı sıfırlamak (ya da ilk parolanı oluşturmak) için aşağıdaki düğmeyi kullan.`,
      cta_url: url,
      cta_label: 'YENİ PAROLA BELİRLE',
      note: 'Bu bağlantı 1 saat geçerlidir ve tek kullanımlıktır; kullanıldığında tüm cihazlardaki oturumlar kapatılır.',
    });
    return this.send(
      to,
      'Konsepthane · Parola sıfırlama',
      `${hello} Parola sıfırlama bağlantısı (1 saat geçerli): ${url}`,
      html,
    );
  }
}
