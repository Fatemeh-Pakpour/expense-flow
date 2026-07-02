import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getLoggerToken } from 'nestjs-pino';
import { Prisma, WebhookSource } from '@prisma/client';
import { HubspotService } from './hubspot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HUBSPOT_QUEUE } from './hubspot.types';
import type { HubspotWebhookEvent } from './hubspot.schema';

/** Minimal valid event; only the fields the service reads matter here. */
function makeEvent(
  overrides: Partial<HubspotWebhookEvent> = {},
): HubspotWebhookEvent {
  return {
    eventId: 1,
    subscriptionId: 10,
    portalId: 100,
    appId: 1000,
    occurredAt: 1700000000000,
    subscriptionType: 'contact.creation',
    attemptNumber: 0,
    objectId: 42,
    changeSource: 'CRM',
    ...overrides,
  } as HubspotWebhookEvent;
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('HubspotService', () => {
  let service: HubspotService;

  const create = jest.fn();
  const queueAdd = jest.fn();
  const prisma = { webhookEvent: { create } };
  const queue = { add: queueAdd };
  const logger = { debug: jest.fn(), info: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HubspotService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(HUBSPOT_QUEUE), useValue: queue },
        { provide: getLoggerToken(HubspotService.name), useValue: logger },
      ],
    }).compile();

    service = moduleRef.get(HubspotService);
  });

  it('persists a new event and enqueues it for processing', async () => {
    create.mockResolvedValue({ id: 'row-1' });

    const result = await service.ingest([makeEvent({ eventId: 1 })]);

    expect(result).toEqual({ accepted: 1, duplicates: 0 });

    // Saved with the right source, external id and event type.
    expect(create).toHaveBeenCalledWith({
      data: {
        source: WebhookSource.HUBSPOT,
        externalId: '1',
        eventType: 'contact.creation',
        payload: expect.objectContaining({ eventId: 1 }),
      },
      select: { id: true },
    });

    // Enqueued with a deterministic jobId for queue-level dedup.
    expect(queueAdd).toHaveBeenCalledWith(
      'process',
      { webhookEventId: 'row-1' },
      expect.objectContaining({
        jobId: 'hubspot:1',
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
      }),
    );
  });

  it('treats a P2002 unique-constraint violation as a duplicate and skips the queue', async () => {
    create.mockRejectedValue(p2002());

    const result = await service.ingest([makeEvent({ eventId: 7 })]);

    expect(result).toEqual({ accepted: 0, duplicates: 1 });
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('counts accepted and duplicate events independently across a batch', async () => {
    create
      .mockResolvedValueOnce({ id: 'row-1' }) // event 1 -> new
      .mockRejectedValueOnce(p2002()) // event 2 -> duplicate
      .mockResolvedValueOnce({ id: 'row-3' }); // event 3 -> new

    const result = await service.ingest([
      makeEvent({ eventId: 1 }),
      makeEvent({ eventId: 2 }),
      makeEvent({ eventId: 3 }),
    ]);

    expect(result).toEqual({ accepted: 2, duplicates: 1 });
    expect(queueAdd).toHaveBeenCalledTimes(2);
    expect(queueAdd.mock.calls.map((c) => c[2].jobId)).toEqual([
      'hubspot:1',
      'hubspot:3',
    ]);
  });

  it('rethrows non-P2002 database errors so HubSpot retries the delivery', async () => {
    const boom = new Error('connection reset');
    create.mockRejectedValue(boom);

    await expect(service.ingest([makeEvent()])).rejects.toThrow(boom);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('returns a zero result for an empty batch without touching prisma or the queue', async () => {
    const result = await service.ingest([]);

    expect(result).toEqual({ accepted: 0, duplicates: 0 });
    expect(create).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
