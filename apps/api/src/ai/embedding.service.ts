import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';
import { AI_CONFIG, type AiConfig } from './ai.types';
import { OllamaClient } from './ollama.client';

const embeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())).min(1),
});

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly ollama: OllamaClient,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
  ) {}

  async embed(input: string): Promise<number[]>;
  async embed(input: readonly string[]): Promise<number[][]>;
  async embed(
    input: string | readonly string[],
  ): Promise<number[] | number[][]> {
    const inputs = typeof input === 'string' ? [input] : input;

    if (
      inputs.length === 0 ||
      inputs.some((value) => value.trim().length === 0)
    ) {
      throw new BadRequestException('Embedding input cannot be empty');
    }

    const response = await this.ollama.post({
      path: '/api/embed',
      operation: 'embedding',
      timeoutMs: this.config.embeddingTimeoutMs,
      schema: embeddingResponseSchema,
      body: {
        model: this.config.embeddingModel,
        input,
      },
    });

    const dimensions = response.embeddings[0].length;
    if (
      dimensions === 0 ||
      response.embeddings.length !== inputs.length ||
      response.embeddings.some((embedding) => embedding.length !== dimensions)
    ) {
      throw new BadGatewayException(
        'Ollama returned inconsistent embedding dimensions',
      );
    }

    return typeof input === 'string'
      ? response.embeddings[0]
      : response.embeddings;
  }
}
