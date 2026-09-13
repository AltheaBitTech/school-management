import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_CONTEXT_KEY, REQUEST_ID_HEADER } from '../constants/request.constants';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId =
      typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    (req as Request & { [REQUEST_ID_CONTEXT_KEY]: string })[REQUEST_ID_CONTEXT_KEY] = requestId;

    next();
  }
}

export function getRequestId(req: Request): string | undefined {
  return (req as Request & { [REQUEST_ID_CONTEXT_KEY]?: string })[REQUEST_ID_CONTEXT_KEY];
}
