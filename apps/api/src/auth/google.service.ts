import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

/** Normalised identity extracted from a verified Google ID token. */
export interface GoogleIdentity {
  /** Google's stable subject id — the only value used as `providerAccountId`. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string | undefined;
  picture?: string | undefined;
  /** Which OAuth client (web / android / ios) the token was minted for. */
  audience: string;
}

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

/**
 * Server-side verification of Google ID tokens (signature via Google's JWKS, issuer, audience,
 * expiry). The allowed audiences are the OAuth client IDs of every first-party app — today the
 * web client, later the Android/iOS clients — so the same endpoint serves all platforms.
 * Nothing from the browser is trusted: e-mail, name and `sub` come from the verified payload.
 */
@Injectable()
export class GoogleTokenVerifier {
  private readonly audiences = (process.env.GOOGLE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  private readonly client = new OAuth2Client();

  get configured() {
    return this.audiences.length > 0;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    if (!this.configured) throw new UnauthorizedException('Google girişi yapılandırılmamış.');
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google kimliği doğrulanamadı.');
    }
    if (!payload || !payload.sub || !payload.iss || !GOOGLE_ISSUERS.has(payload.iss))
      throw new UnauthorizedException('Google kimliği doğrulanamadı.');
    if (!payload.aud || !this.audiences.includes(String(payload.aud)))
      throw new UnauthorizedException('Google kimliği bu uygulama için verilmemiş.');
    if (!payload.email) throw new UnauthorizedException('Google hesabında e-posta adresi yok.');
    return {
      sub: payload.sub,
      email: payload.email.toLocaleLowerCase('en-US'),
      emailVerified: payload.email_verified === true,
      name: payload.name,
      picture: payload.picture,
      audience: String(payload.aud),
    };
  }
}
