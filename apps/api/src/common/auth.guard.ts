import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AccessClaims, AuthenticatedRequest } from './auth.types';
import { DatabaseService } from './database.module';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Oturum gerekli.');
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        secret: process.env.JWT_ACCESS_SECRET!,
      });
      const user = await this.db.user.findUnique({
        where: { id: claims.sub },
        select: {
          email: true,
          status: true,
          roles: {
            select: {
              role: {
                select: {
                  permissions: { select: { permission: { select: { key: true } } } },
                },
              },
            },
          },
        },
      });
      if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Oturum geçersiz.');
      const permissions = [
        ...new Set(
          user.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.key),
          ),
        ),
      ];
      (request as AuthenticatedRequest).user = {
        sub: claims.sub,
        email: user.email,
        permissions,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Oturum geçersiz veya süresi dolmuş.');
    }
  }
}
