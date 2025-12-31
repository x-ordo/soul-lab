import { FastifyPluginAsync, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/index.js';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

const HTTP_STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  402: 'INSUFFICIENT_CREDITS',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

function getErrorCode(statusCode: number): string {
  return HTTP_STATUS_TO_ERROR_CODE[statusCode] || 'INTERNAL_ERROR';
}

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const statusCode = error.statusCode || 500;
      const errorCode = getErrorCode(statusCode);
      const isProd = isProduction();

      logger.error(
        {
          requestId: request.requestId,
          correlationId: request.correlationId,
          method: request.method,
          path: request.url,
          statusCode,
          errorCode,
          error: {
            message: error.message,
            code: error.code,
            stack: isProd ? undefined : error.stack,
          },
        },
        'request_error'
      );

      const response: ErrorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: isProd && statusCode >= 500 ? 'Internal server error' : error.message,
          requestId: request.requestId,
          ...(isProd ? {} : { details: error.stack }),
        },
      };

      reply.status(statusCode).send(response);
    }
  );

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.requestId,
      },
    };

    reply.status(404).send(response);
  });
};
