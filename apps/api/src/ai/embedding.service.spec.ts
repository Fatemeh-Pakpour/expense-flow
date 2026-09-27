import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { AiConfig } from './ai.types';
import { EmbeddingService } from './embedding.service';
import type { OllamaClient } from './ollama.client';

describe('EmbeddingService', () => {
  const post = jest.fn();
  const ollama = { post } as unknown as OllamaClient;
  const config = {
    embeddingModel: 'nomic-embed-text',
    embeddingTimeoutMs: 60_000,
  } as AiConfig;
  const service = new EmbeddingService(ollama, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one embedding for a string input', async () => {
    post.mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] });

    await expect(service.embed('expense policy')).resolves.toEqual([
      0.1, 0.2, 0.3,
    ]);
  });

  it('rejects empty input before calling Ollama', async () => {
    await expect(service.embed('  ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects inconsistent embedding dimensions', async () => {
    post.mockResolvedValue({ embeddings: [[0.1, 0.2], [0.3]] });

    await expect(service.embed(['one', 'two'])).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
