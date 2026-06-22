/** DI token for the resolved HubSpot config (see `loadHubspotEnv`). */
export const HUBSPOT_CONFIG = 'HUBSPOT_CONFIG';

/** Name of the BullMQ queue that processes HubSpot webhook events. */
export const HUBSPOT_QUEUE = 'hubspot-webhooks';

/** Payload of a queued job — just the DB id; the row is the source of truth. */
export interface HubspotJobData {
  webhookEventId: string;
}
