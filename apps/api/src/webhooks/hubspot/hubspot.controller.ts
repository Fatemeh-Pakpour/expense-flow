import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { HubspotSignatureGuard } from './hubspot-signature.guard';
import {
  hubspotWebhookBodySchema,
  type HubspotWebhookEvent,
} from './hubspot.schema';
import { HubspotService } from './hubspot.service';

// With the global `api` prefix this resolves to: POST /api/webhooks/hubspot
@Controller('webhooks/hubspot')
export class HubspotController {
  constructor(private readonly hubspotService: HubspotService) { }

  /**
   * Pipeline: signature guard → Zod payload validation → idempotent save +
   * enqueue (in the service) → 202 Accepted. Processing happens asynchronously
   * in HubspotProcessor.
   */
  @Post()
  @HttpCode(202)
  @UseGuards(HubspotSignatureGuard)
  async handleWebhook(
    @Body(new ZodValidationPipe(hubspotWebhookBodySchema))
    events: HubspotWebhookEvent[],
  ): Promise<{ accepted: number; duplicates: number }> {
    return this.hubspotService.ingest(events);

  }
}