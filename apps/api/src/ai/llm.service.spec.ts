import { BadRequestException } from '@nestjs/common';
import type { AiConfig } from './ai.types';
import { LlmService } from './llm.service';
import type { OllamaClient } from './ollama.client';

describe('LlmService', () => {
  type ChatPostOptions = {
    path: string;
    operation: 'chat';
    timeoutMs: number;
    body: {
      model: string;
      stream: boolean;
    };
  };

  type ChatResponse = {
    message: { role: string; content: string };
  };

  const post = jest.fn<Promise<ChatResponse>, [ChatPostOptions]>();
  const ollama = { post } as unknown as OllamaClient;
  const config = {
    chatModel: 'qwen3:1.7b',
    chatTimeoutMs: 120_000,
  } as AiConfig;
  const service = new LlmService(ollama, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the generated message content', async () => {
    post.mockResolvedValue({
      message: { role: 'assistant', content: 'An answer' },
    });

    await expect(
      service.generate([{ role: 'user', content: 'A question' }]),
    ).resolves.toBe('An answer');
    expect(post).toHaveBeenCalledTimes(1);
    const [request] = post.mock.calls[0];
    expect(request.path).toBe('/api/chat');
    expect(request.operation).toBe('chat');
    expect(request.timeoutMs).toBe(120_000);
    expect(request.body).toMatchObject({
      model: 'qwen3:1.7b',
      stream: false,
    });
  });

  it('rejects empty messages before calling Ollama', async () => {
    await expect(service.generate([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(post).not.toHaveBeenCalled();
  });
});
