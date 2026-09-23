import { Catch, ArgumentsHost, ExceptionFilter, HttpException } from '@nestjs/common';
import { recordError } from './metrics';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    recordError();
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest<{ id?: string }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const detail = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
    const error = typeof detail.error === 'object' && detail.error !== null ? detail.error as Record<string, unknown> : detail;
    response.status(status).send({
      ok: false,
      error: {
        code: typeof error.code === 'string' ? error.code : status >= 500 ? 'server' : 'request_error',
        message: typeof error.message === 'string' ? error.message : 'Request failed.',
        ...(error.fields ? { fields: error.fields } : {}),
        ...(request.id ? { requestId: request.id } : {}),
      },
    });
  }
}
