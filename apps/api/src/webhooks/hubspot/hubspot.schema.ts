import { z } from 'zod';

/**
 * A single HubSpot webhook notification. `.passthrough()` keeps unknown fields
 * instead of failing — HubSpot adds new properties to payloads over time, and a
 * receiver should not 400 just because it doesn't model a field yet.
 *
 * See: https://developers.hubspot.com/docs/api/webhooks
 */
export const hubspotEventSchema = z
  .object({
    eventId: z.number(),
    subscriptionId: z.number(),
    portalId: z.number(),
    appId: z.number(),
    occurredAt: z.number(),
    subscriptionType: z.string(),
    attemptNumber: z.number(),
    objectId: z.number(),
    changeSource: z.string(),
    propertyName: z.string().optional(),
    propertyValue: z.string().optional(),
    changeFlag: z.string().optional(),
  })
  .passthrough();

/** HubSpot delivers an array of events per request. */
export const hubspotWebhookBodySchema = z.array(hubspotEventSchema);

export type HubspotWebhookEvent = z.infer<typeof hubspotEventSchema>;
