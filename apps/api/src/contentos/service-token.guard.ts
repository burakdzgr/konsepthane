import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { tokensEqual } from './contentos.util';

/**
 * Bearer service authentication for the ContentOS publishing bridge
 * (Publishing API v1 contract). The token is a dedicated machine secret —
 * never a user/admin JWT — supplied as `CONTENTOS_SERVICE_TOKEN`. While the
 * variable is unset the integration is deliberately unavailable (503):
 * a missing secret must never mean an open door.
 */
@Injectable()
export class ContentosServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.CONTENTOS_SERVICE_TOKEN;
    if (!expected || expected.length < 32)
      throw new ServiceUnavailableException(
        'ContentOS entegrasyonu yapılandırılmadı (CONTENTOS_SERVICE_TOKEN).',
      );
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || !tokensEqual(token, expected))
      throw new UnauthorizedException('Servis kimliği doğrulanamadı.');
    return true;
  }
}
