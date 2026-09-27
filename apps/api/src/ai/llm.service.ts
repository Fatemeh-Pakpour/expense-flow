import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AI_CONFIG, type AiConfig, type ChatMessage } from './ai.types';
import { OllamaClient } from './ollama.client';

const chatResponseSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
});

export type GenerateOptions = {
  temperature?: number;
};

@Injectable()
export class LlmService {
  constructor(
    private readonly ollama: OllamaClient,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
  ) {}

  async generate(
    messages: readonly ChatMessage[],
    options: GenerateOptions = {},
  ): Promise<string> {
    if (messages.length === 0) {
      throw new BadRequestException('At least one chat message is required');
    }

    if (messages.some((message) => message.content.trim().length === 0)) {
      throw new BadRequestException('Chat messages cannot be empty');
    }

    if (
      options.temperature !== undefined &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw new BadRequestException('Temperature must be between 0 and 2');
    }

    const response = await this.ollama.post({
      path: '/api/chat',
      operation: 'chat',
      timeoutMs: this.config.chatTimeoutMs,
      schema: chatResponseSchema,
      body: {
        model: this.config.chatModel,
        messages,
        stream: false,
        ...(options.temperature === undefined
          ? {}
          : { options: { temperature: options.temperature } }),
      },
    });

    return response.message.content;
  }
}
