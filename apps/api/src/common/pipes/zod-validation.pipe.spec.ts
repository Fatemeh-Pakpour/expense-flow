import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  });

  it('returns the parsed value when the input is valid', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { name: 'Ada', age: 36 };

    expect(pipe.transform(input)).toEqual(input);
  });

  it('strips nothing but yields the typed, parsed data', () => {
    const arraySchema = z.array(z.number());
    const pipe = new ZodValidationPipe(arraySchema);

    expect(pipe.transform([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('throws BadRequestException with structured issues on invalid input', () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ name: 'Ada', age: -1 });
      fail('expected transform to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        message: string;
        errors: unknown[];
      };
      expect(response.message).toBe('Payload validation failed');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors.length).toBeGreaterThan(0);
    }
  });

  it('throws when a required field is missing', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ name: 'Ada' })).toThrow(BadRequestException);
  });
});
