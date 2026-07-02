import { Test, TestingModule } from '@nestjs/testing';
import { HubspotController } from './hubspot.controller';
import { HubspotService, IngestResult } from './hubspot.service';
import { HubspotSignatureGuard } from './hubspot-signature.guard';
import type { HubspotWebhookEvent } from './hubspot.schema';

describe('HubspotController', () => {
  let controller: HubspotController;
  const ingest = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HubspotController],
      providers: [{ provide: HubspotService, useValue: { ingest } }],
    })
      .overrideGuard(HubspotSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(HubspotController);
  });

  it('delegates the validated events to the service and returns its result', async () => {
    const events = [{ eventId: 1 }] as unknown as HubspotWebhookEvent[];
    const result: IngestResult = { accepted: 1, duplicates: 0 };
    ingest.mockResolvedValue(result);

    await expect(controller.handleWebhook(events)).resolves.toEqual(result);
    expect(ingest).toHaveBeenCalledWith(events);
  });
});
