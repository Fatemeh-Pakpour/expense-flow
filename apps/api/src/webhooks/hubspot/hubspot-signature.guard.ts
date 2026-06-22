import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Signature } from '@hubspot/api-client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { HubspotEnv } from '../../config/env';
import { HUBSPOT_CONFIG } from './hubspot.types';

/**
 * Validates the `X-HubSpot-Signature-v3` header so only genuine HubSpot
 * requests reach the controller. v3 is an HMAC-SHA256 over
 * method + url + body + timestamp, and the timestamp guards against replays
 * (HubSpot rejects anything older than 5 minutes).
 *
 * Requires the raw request body, so the app is created with `{ rawBody: true }`
 * in `main.ts`.
 */
@Injectable()
export class HubspotSignatureGuard implements CanActivate {
  constructor(@Inject(HUBSPOT_CONFIG) private readonly config: HubspotEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const signature = req.headers['x-hubspot-signature-v3'] as
      | string
      | undefined;
    const timestampHeader = req.headers['x-hubspot-request-timestamp'] as
      | string
      | undefined;

    if (!signature || !timestampHeader) {
      throw new UnauthorizedException('Missing HubSpot signature headers');
    }

    const rawBody = req.rawBody?.toString('utf8') ?? '';

    try {
      const isValid = Signature.isValid({
        signatureVersion: 'v3',
        signature,
        clientSecret: this.config.clientSecret,
        method: req.method,
        url: `${this.config.publicUrl}${req.originalUrl}`,
        requestBody: rawBody,
        timestamp: Number.parseInt(timestampHeader, 10),
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid HubSpot signature');
      }
    } catch (err) {
      // `Signature.isValid` throws when the timestamp is too old (replay window).
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('HubSpot signature validation failed');
    }

    return true;
  }
}
