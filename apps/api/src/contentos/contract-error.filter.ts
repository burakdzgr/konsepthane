import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

/**
 * The ContentOS contract requires machine-readable errors of the shape
 * `{"error": {"code", "message"}}` — different from the platform default.
 * Scoped to the ContentOS controller only; every other API surface keeps
 * the standard Nest error body.
 */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'malformed_request',
  401: 'authentication_failed',
  403: 'service_not_allowed',
  404: 'not_found',
  409: 'idempotency_conflict',
  413: 'media_too_large',
  422: 'validation_failed',
  429: 'rate_limited',
  503: 'temporarily_unavailable',
};

@Catch(HttpException)
export class ContentosContractErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const detail =
      typeof payload === 'object' && payload !== null
        ? (payload as { code?: string; message?: string | string[] })
        : { message: String(payload) };
    const code = detail.code ?? CODE_BY_STATUS[status] ?? 'server_failure';
    const message = Array.isArray(detail.message)
      ? detail.message.join('; ')
      : (detail.message ?? code);
    response.status(status).json({ error: { code, message: message.slice(0, 500) } });
  }
}
