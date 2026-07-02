import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Signature } from '@hubspot/api-client';
import { HubspotSignatureGuard } from './hubspot-signature.guard';
import type { HubspotEnv } from '../../config/env';

// Replace the real HMAC check with a mock we can steer per test.
jest.mock('@hubspot/api-client', () => ({
  Signature: { isValid: jest.fn() },
}));

const isValid = Signature.isValid as jest.Mock;

const config: HubspotEnv = {
  clientSecret: 'secret',
  publicUrl: 'https://app.example.com',
};

function makeContext(
  req: Partial<RawBodyRequest<Request>>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeRequest(
  overrides: Partial<RawBodyRequest<Request>> = {},
): Partial<RawBodyRequest<Request>> {
  return {
    method: 'POST',
    originalUrl: '/api/webhooks/hubspot',
    headers: {
      'x-hubspot-signature-v3': 'sig',
      'x-hubspot-request-timestamp': '1700000000000',
    },
    rawBody: Buffer.from('[]', 'utf8'),
    ...overrides,
  } as Partial<RawBodyRequest<Request>>;
}

describe('HubspotSignatureGuard', () => {
  let guard: HubspotSignatureGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new HubspotSignatureGuard(config);
  });

  it('allows the request when the signature is valid', () => {
    isValid.mockReturnValue(true);

    expect(guard.canActivate(makeContext(makeRequest()))).toBe(true);

    // URL is reconstructed from the configured public base + original path.
    expect(isValid).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureVersion: 'v3',
        signature: 'sig',
        clientSecret: 'secret',
        method: 'POST',
        url: 'https://app.example.com/api/webhooks/hubspot',
        requestBody: '[]',
        timestamp: 1700000000000,
      }),
    );
  });

  it('rejects when the signature header is missing', () => {
    const req = makeRequest({
      headers: { 'x-hubspot-request-timestamp': '1700000000000' },
    });

    expect(() => guard.canActivate(makeContext(req))).toThrow(
      UnauthorizedException,
    );
    expect(isValid).not.toHaveBeenCalled();
  });

  it('rejects when the timestamp header is missing', () => {
    const req = makeRequest({
      headers: { 'x-hubspot-signature-v3': 'sig' },
    });

    expect(() => guard.canActivate(makeContext(req))).toThrow(
      UnauthorizedException,
    );
    expect(isValid).not.toHaveBeenCalled();
  });

  it('rejects when the signature does not match', () => {
    isValid.mockReturnValue(false);

    expect(() => guard.canActivate(makeContext(makeRequest()))).toThrow(
      'Invalid HubSpot signature',
    );
  });

  it('wraps unexpected validation errors (e.g. replay window) as Unauthorized', () => {
    isValid.mockImplementation(() => {
      throw new Error('timestamp too old');
    });

    expect(() => guard.canActivate(makeContext(makeRequest()))).toThrow(
      'HubSpot signature validation failed',
    );
  });
});
