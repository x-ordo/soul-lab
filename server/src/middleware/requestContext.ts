import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    correlationId: string;
    startTime: number;
  }
}

export const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestId = randomUUID();
    request.correlationId =
      (request.headers['x-correlation-id'] as string) || request.requestId;
    request.startTime = Date.now();

    logger.info(
      {
        requestId: request.requestId,
        correlationId: request.correlationId,
        method: request.method,
        path: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      'request_started'
    );
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = Date.now() - request.startTime;

    logger.info(
      {
        requestId: request.requestId,
        correlationId: request.correlationId,
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        responseTime,
      },
      'request_completed'
    );
  });

  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('x-request-id', request.requestId);
    reply.header('x-correlation-id', request.correlationId);
  });
};
