import {
  BadGatewayException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { z } from 'zod';
import { AI_CONFIG, type AiConfig } from './ai.types';

type RequestOptions<T> = {
  path: string;
  body: unknown;
  schema: z.ZodType<T>;
  timeoutMs: number;
  operation: 'chat' | 'embedding';
};

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

@Injectable()
export class OllamaClient {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    @InjectPinoLogger(OllamaClient.name) private readonly logger: PinoLogger,
  ) {}

  async post<T>(options: RequestOptions<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetch(
          `${this.config.ollamaBaseUrl}${options.path}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options.body),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const detail = (await response.text()).slice(0, 500);

          if (
            RETRYABLE_STATUS_CODES.has(response.status) &&
            attempt < this.config.maxRetries
          ) {
            this.logger.warn(
              {
                operation: options.operation,
                status: response.status,
                attempt: attempt + 1,
              },
              'Transient Ollama response; retrying',
            );
            await this.waitBeforeRetry(attempt);
            continue;
          }

          this.logger.error(
            {
              operation: options.operation,
              status: response.status,
              detail,
            },
            'Ollama request failed',
          );
          throw new BadGatewayException(
            `Ollama ${options.operation} request failed with status ${response.status}`,
          );
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          this.logger.error(
            { operation: options.operation },
            'Ollama returned malformed JSON',
          );
          throw new BadGatewayException(
            `Ollama returned an invalid ${options.operation} response`,
          );
        }
        const parsed = options.schema.safeParse(payload);

        if (!parsed.success) {
          this.logger.error(
            {
              operation: options.operation,
              issues: parsed.error.issues,
            },
            'Ollama returned an invalid response',
          );
          throw new BadGatewayException(
            `Ollama returned an invalid ${options.operation} response`,
          );
        }

        this.logger.debug(
          {
            operation: options.operation,
            durationMs: Date.now() - startedAt,
            attempt: attempt + 1,
          },
          'Ollama request completed',
        );
        return parsed.data;
      } catch (error: unknown) {
        if (
          error instanceof BadGatewayException ||
          error instanceof GatewayTimeoutException ||
          error instanceof ServiceUnavailableException
        ) {
          throw error;
        }

        if (controller.signal.aborted) {
          this.logger.error(
            { operation: options.operation, timeoutMs: options.timeoutMs },
            'Ollama request timed out',
          );
          throw new GatewayTimeoutException(
            `Ollama ${options.operation} request timed out`,
          );
        }

        if (attempt < this.config.maxRetries) {
          this.logger.warn(
            { operation: options.operation, attempt: attempt + 1 },
            'Could not reach Ollama; retrying',
          );
          await this.waitBeforeRetry(attempt);
          continue;
        }

        this.logger.error(
          { operation: options.operation, error },
          'Could not reach Ollama',
        );
        throw new ServiceUnavailableException(
          'Ollama is unavailable. Ensure it is installed and running.',
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException('Ollama is unavailable');
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    const exponentialDelay = this.config.retryBaseDelayMs * 2 ** attempt;
    const jitter = Math.floor(
      Math.random() * Math.max(exponentialDelay / 4, 1),
    );
    await new Promise((resolve) =>
      setTimeout(resolve, exponentialDelay + jitter),
    );
  }
}
