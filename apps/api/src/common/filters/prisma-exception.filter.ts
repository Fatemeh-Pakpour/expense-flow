import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma-client';
import { Request, Response } from 'express';

/**
 * Translates Prisma's known request errors into safe, normalized HTTP
 * responses. Registered AFTER GlobalExceptionFilter so that — because Nest
 * checks the most-recently-registered filter first — Prisma errors land here,
 * while every other exception falls through to the catch-all filter.
 *
 * The response shape mirrors GlobalExceptionFilter:
 *   { statusCode, message, path, timestamp }
 *
 * Raw Prisma messages (which can leak table/column names and query internals)
 * are never sent to the client.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.map(exception);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        // meta.target names the field(s) that collided.
        const target = exception.meta?.target;
        const fields = Array.isArray(target) ? target.join(', ') : 'value';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`,
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
        };
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Provided value is too long for one of the fields',
        };
      default:
        // Unknown Prisma error: don't leak internals, don't pretend success.
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
        };
    }
  }
}
