import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { z } from 'zod';
import type { AiConfig } from './ai.types';
import { OllamaClient } from './ollama.client';

const responseSchema = z.object({ value: z.string() });

describe('OllamaClient', () => {
  const config: AiConfig = {
    ollamaBaseUrl: 'http://localhost:11434',
    chatModel: 'qwen3:1.7b',
    embeddingModel: 'nomic-embed-text',
    chatTimeoutMs: 100,
    embeddingTimeoutMs: 100,
    maxRetries: 1,
    retryBaseDelayMs: 0,
  };
  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  let client: OllamaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new OllamaClient(config, logger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a validated response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ value: 'ok' })));

    await expect(
      client.post({
        path: '/api/test',
        body: {},
        schema: responseSchema,
        timeoutMs: 100,
        operation: 'chat',
      }),
    ).resolves.toEqual({ value: 'ok' });
  });

  it('retries a transient response once', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 'recovered' })),
      );

    await expect(
      client.post({
        path: '/api/test',
        body: {},
        schema: responseSchema,
        timeoutMs: 100,
        operation: 'chat',
      }),
    ).resolves.toEqual({ value: 'recovered' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient response', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('model not found', { status: 404 }));

    await expect(
      client.post({
        path: '/api/test',
        body: {},
        schema: responseSchema,
        timeoutMs: 100,
        operation: 'chat',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed successful responses without retrying', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('not json'));

    await expect(
      client.post({
        path: '/api/test',
        body: {},
        schema: responseSchema,
        timeoutMs: 100,
        operation: 'chat',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a request that exceeds its timeout', async () => {
    jest.spyOn(global, 'fetch').mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    await expect(
      client.post({
        path: '/api/test',
        body: {},
        schema: responseSchema,
        timeoutMs: 5,
        operation: 'chat',
      }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });
});
