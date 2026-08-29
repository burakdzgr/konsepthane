import type { Request } from 'express';

export interface AccessClaims {
  sub: string;
  email: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AccessClaims;
}
