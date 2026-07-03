import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { WebhookEventStatus } from '@prisma-client';
import { Job } from 'bullmq';
import { HubspotProcessor } from './hubspot.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { HubspotJobData } from './hubspot.types';

function makeJob(webhookEventId = 'row-1'): Job<HubspotJobData> {
  return { data: { webhookEventId } } as Job<HubspotJobData>;
}

describe('HubspotProcessor', () => {
  let processor: HubspotProcessor;

  const findUnique = jest.fn();
  const update = jest.fn();
  const prisma = { webhookEvent: { findUnique, update } };
  const logger = { warn: jest.fn(), debug: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    update.mockResolvedValue({});

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HubspotProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: getLoggerToken(HubspotProcessor.name), useValue: logger },
      ],
    }).compile();

    processor = moduleRef.get(HubspotProcessor);
  });

  it('marks the event PROCESSING then PROCESSED on success', async () => {
    findUnique.mockResolvedValue({
      id: 'row-1',
      status: WebhookEventStatus.RECEIVED,
      eventType: 'contact.creation',
    });

    await processor.process(makeJob('row-1'));

    // First update -> PROCESSING with attempt increment.
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'row-1' },
      data: {
        status: WebhookEventStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });

    // Final update -> PROCESSED, clears any prior error, stamps processedAt.
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'row-1' },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: expect.any(Date),
        error: null,
      },
    });
  });

  it('warns and does nothing when the event row is missing', async () => {
    findUnique.mockResolvedValue(null);

    await processor.process(makeJob('missing'));

    expect(logger.warn).toHaveBeenCalledWith(
      { webhookEventId: 'missing' },
      expect.any(String),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('is idempotent: skips an already PROCESSED event', async () => {
    findUnique.mockResolvedValue({
      id: 'row-1',
      status: WebhookEventStatus.PROCESSED,
      eventType: 'contact.creation',
    });

    await processor.process(makeJob('row-1'));

    expect(update).not.toHaveBeenCalled();
  });

  it('marks the event FAILED and rethrows when processing throws', async () => {
    findUnique.mockResolvedValue({
      id: 'row-1',
      status: WebhookEventStatus.RECEIVED,
      eventType: 'contact.creation',
    });

    const boom = new Error('downstream exploded');
    update
      .mockResolvedValueOnce({}) // PROCESSING update succeeds
      .mockRejectedValueOnce(boom) // PROCESSED update throws
      .mockResolvedValueOnce({}); // FAILED update succeeds

    await expect(processor.process(makeJob('row-1'))).rejects.toThrow(boom);

    expect(update).toHaveBeenNthCalledWith(3, {
      where: { id: 'row-1' },
      data: { status: WebhookEventStatus.FAILED, error: 'downstream exploded' },
    });
  });
});
