import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma, WebhookSource } from '@prisma/client';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import type { HubspotWebhookEvent } from './hubspot.schema';
import { HUBSPOT_QUEUE, type HubspotJobData } from './hubspot.types';

export interface IngestResult {
  accepted: number;
  duplicates: number;
}

@Injectable()
export class HubspotService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(HUBSPOT_QUEUE) private readonly queue: Queue<HubspotJobData>,
    @InjectPinoLogger(HubspotService.name) private readonly logger: PinoLogger,
  ) { }

  /**
   * Persist each event idempotently and enqueue it for async processing.
   * Returns fast so the controller can reply 202 — actual work happens in the
   * BullMQ processor.
   */
  async ingest(events: HubspotWebhookEvent[]): Promise<IngestResult> {
    let accepted = 0;
    let duplicates = 0;

    for (const event of events) {
      const externalId = String(event.eventId);

      // Steps 3 + 4: idempotent save. The unique (source, externalId) constraint
      // makes a redelivered event a no-op via the P2002 catch below.
      let webhookEventId: string;
      try {
        const saved = await this.prisma.webhookEvent.create({
          data: {
            source: WebhookSource.HUBSPOT,
            externalId,
            eventType: event.subscriptionType,
            payload: event as unknown as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        webhookEventId = saved.id;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          duplicates += 1;
          this.logger.debug({ externalId }, 'Duplicate HubSpot event ignored');
          continue;
        }
        throw err;
      }

      // Step 5: push to queue. The jobId gives queue-level dedup as a second
      // line of defence; if enqueue fails we surface it so HubSpot retries (the
      // row already exists, so the retry just re-enqueues).
      await this.queue.add(
        'process',
        { webhookEventId },
        {
          jobId: `hubspot:${externalId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      );

      accepted += 1;
    }

    this.logger.info(
      { accepted, duplicates, total: events.length },
      'Ingested HubSpot webhook batch',
    );

    return { accepted, duplicates };
  }
}
