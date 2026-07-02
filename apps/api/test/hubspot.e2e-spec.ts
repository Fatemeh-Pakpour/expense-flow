import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HubspotController } from '../src/webhooks/hubspot/hubspot.controller';
import { HubspotService } from '../src/webhooks/hubspot/hubspot.service';
import { HubspotSignatureGuard } from '../src/webhooks/hubspot/hubspot-signature.guard';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * HTTP-layer integration test for the HubSpot webhook endpoint. Boots a real
 * Nest app with the controller, the Zod validation pipe, the global prefix and
 * the exception filter wired exactly as in production — but with the signature
 * guard and the service (queue/DB) stubbed so no Redis/Postgres is required.
 */
function validEvent(eventId = 1) {
  return {
    eventId,
    subscriptionId: 10,
    portalId: 100,
    appId: 1000,
    occurredAt: 1700000000000,
    subscriptionType: 'contact.creation',
    attemptNumber: 0,
    objectId: 42,
    changeSource: 'CRM',
  };
}

describe('HubspotController (e2e)', () => {
  let app: INestApplication<App>;
  const ingest = jest.fn();

  // Flip to false in a test to simulate a rejected signature.
  let allowRequest = true;

  beforeEach(async () => {
    jest.clearAllMocks();
    allowRequest = true;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HubspotController],
      providers: [{ provide: HubspotService, useValue: { ingest } }],
    })
      .overrideGuard(HubspotSignatureGuard)
      .useValue({
        canActivate: () => {
          if (!allowRequest) {
            throw new UnauthorizedException('Invalid HubSpot signature');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts so routing and error shapes match production.
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a valid batch and returns 202 with the ingest result', async () => {
    ingest.mockResolvedValue({ accepted: 1, duplicates: 0 });

    await request(app.getHttpServer())
      .post('/api/webhooks/hubspot')
      .send([validEvent(1)])
      .expect(202)
      .expect({ accepted: 1, duplicates: 0 });

    expect(ingest).toHaveBeenCalledTimes(1);
  });

  it('rejects a malformed payload with 400 and does not call the service', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/hubspot')
      .send([{ eventId: 'not-a-number' }]) // fails the Zod schema
      .expect(400);

    expect(ingest).not.toHaveBeenCalled();
  });

  it('rejects a non-array body with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/hubspot')
      .send(validEvent(1)) // object, but the schema expects an array
      .expect(400);

    expect(ingest).not.toHaveBeenCalled();
  });

  it('returns 401 when the signature guard rejects the request', async () => {
    allowRequest = false;

    await request(app.getHttpServer())
      .post('/api/webhooks/hubspot')
      .send([validEvent(1)])
      .expect(401);

    expect(ingest).not.toHaveBeenCalled();
  });
});
