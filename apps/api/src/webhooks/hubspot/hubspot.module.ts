import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { loadHubspotEnv } from '../../config/env';
import { HubspotController } from './hubspot.controller';
import { HubspotProcessor } from './hubspot.processor';
import { HubspotSignatureGuard } from './hubspot-signature.guard';
import { HubspotService } from './hubspot.service';
import { HUBSPOT_CONFIG, HUBSPOT_QUEUE } from './hubspot.types';

@Module({
  imports: [BullModule.registerQueue({ name: HUBSPOT_QUEUE })],
  controllers: [HubspotController],
  providers: [
    HubspotService,
    HubspotProcessor,
    HubspotSignatureGuard,
    { provide: HUBSPOT_CONFIG, useFactory: loadHubspotEnv },
  ],
})
export class HubspotModule {}
