import type { Params } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

export const loggerConfig: Params = {
  pinoHttp: {
    level: isProduction ? 'info' : 'debug',
    // Install 'pino-pretty' (already a dev dependency) for readable dev logs.
    // In production we emit raw JSON to stdout for log shippers to consume.
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
    // Redact sensitive fields from request/response logs.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
};
