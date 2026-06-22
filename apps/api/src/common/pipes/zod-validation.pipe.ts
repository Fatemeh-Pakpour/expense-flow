import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates and parses an incoming value against a Zod schema. On failure it
 * throws a 400 with the structured issues, which the GlobalExceptionFilter then
 * normalizes. Returns the parsed (and typed) value on success.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Payload validation failed',
        errors: result.error.issues,
      });
    }

    return result.data;
  }
}
