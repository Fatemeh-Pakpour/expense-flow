import { Module } from '@nestjs/common';
import { loadAiEnv } from '../config/env';
import { AI_CONFIG } from './ai.types';
import { EmbeddingService } from './embedding.service';
import { LlmService } from './llm.service';
import { OllamaClient } from './ollama.client';

@Module({
  providers: [
    OllamaClient,
    LlmService,
    EmbeddingService,
    { provide: AI_CONFIG, useFactory: loadAiEnv },
  ],
  exports: [LlmService, EmbeddingService],
})
export class AiModule {}
