import { Processor, WorkerHost } from '@nestjs/bullmq';
import { WebhookEventStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { HUBSPOT_QUEUE, type HubspotJobData } from './hubspot.types';

/**
 * Consumes queued HubSpot events and runs the actual business logic. Runs out
 * of band from the HTTP request, so it can be slow and is retried by BullMQ
 * (see job options in HubspotService) without HubSpot ever waiting.
 */
@Processor(HUBSPOT_QUEUE)
export class HubspotProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(HubspotProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<HubspotJobData>): Promise<void> {
    const { webhookEventId } = job.data;

    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!event) {
      this.logger.warn({ webhookEventId }, 'Webhook event row not found');
      return;
    }

    if (event.status === WebhookEventStatus.PROCESSED) {
      return; // already done on an earlier attempt
    }

    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookEventStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });

    try {
      // Business logic per subscription type. These branches will call out to
      // other services (DB, HubSpot CRM API, etc.) as the integration grows.
      switch (event.eventType) {
        case 'contact.creation':
          // TODO: handle new contact
          break;
        case 'contact.propertyChange':
          // TODO: handle contact property change
          break;
        default:
          this.logger.debug(
            { eventType: event.eventType },
            'Unhandled HubSpot subscription type',
          );
      }

      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
          error: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: WebhookEventStatus.FAILED, error: message },
      });
      // Re-throw so BullMQ records the failure and retries per the backoff policy.
      throw err;
    }
  }
}
